import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { open, showInFinder, showToast, Toast } from "@raycast/api";
import { fakerKey, isReplaying } from "@chrismessina/raycast-faker";
import {
  createDownloadHistory,
  formatProgressLine,
  isDownloadError,
  reconcileHistory,
  releaseReservation,
  sanitizeFilename,
  startDownload,
  uniquePath,
  watchStatus,
} from "@chrismessina/raycast-downloader";
import { MercuryLogin } from "./logins";
import { API_HOST, copyErrorAction, log, Statement } from "./mercury";

type Target = "downloads";

/**
 * Downloaded statements, so the list can mark them and open the local copy. URLs are never stored.
 * Built on each use so its storage key follows raycast-faker's current mode.
 */
function statementHistory() {
  return createDownloadHistory<{ statementId: string; target: Target }>({
    key: fakerKey("statement-downloads"),
    // The newest copy per statement and destination replaces the last, so re-downloading one
    // statement can't push others out of the history.
    dedupeBy: (record) => (record.meta ? `${record.meta.statementId}:${record.meta.target}` : undefined),
    urlPolicy: "omit-signed",
  });
}

const TAX_FORMS: Record<string, string> = { FMV: "Fair market value", SDIRA: "Self-directed IRA statement" };

/** "September 2026" for a monthly statement; "Form 1099 · 2025" or "Trade confirmation" for Treasury documents. */
export function statementTitle(statement: Statement) {
  const type = statement.documentType;
  if (!type || type === "MonthlyStatement") return statementMonth(statement);
  if (type === "TradeConfirmation") return "Trade confirmation";
  return `${TAX_FORMS[type] ?? `Form ${type}`} · ${statement.startDate.slice(0, 4)}`;
}

function statementMonth(statement: Statement) {
  return new Date(statement.startDate).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function statementFilename(label: string, statement: Statement) {
  const type =
    statement.documentType && statement.documentType !== "MonthlyStatement" ? ` ${statement.documentType}` : "";
  // "Mercury Checking 7791" already names Mercury; "Treasury" doesn't.
  const name = label.replace(/•/g, "");
  const prefixed = name.startsWith("Mercury") ? name : `Mercury ${name}`;
  return sanitizeFilename(`${prefixed} ${statement.startDate.slice(0, 7)}${type}.pdf`);
}

function isMercuryApi(url: string) {
  const parsed = new URL(url);
  return parsed.protocol === "https:" && parsed.host === API_HOST;
}

/**
 * Where to download from, and whether the token goes along. The token only ever goes to
 * https://api.mercury.com. If Mercury redirects (to a pre-signed storage URL, say), the redirect
 * is resolved here and downloaded without it, rather than trusting curl to drop the header.
 */
async function resolveSource(
  login: MercuryLogin,
  url: string,
): Promise<{ url: string; headers: Record<string, string>; followRedirects: boolean }> {
  if (!isMercuryApi(url)) return { url, headers: {}, followRedirects: true };
  const headers = { Authorization: `Bearer ${login.token}` };
  try {
    const response = await fetch(url, { method: "HEAD", headers, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const target = new URL(location, url).toString();
      return isMercuryApi(target)
        ? { url: target, headers, followRedirects: false }
        : { url: target, headers: {}, followRedirects: true };
    }
  } catch {
    // HEAD not supported: fall through and download directly, refusing any redirect.
  }
  return { url, headers, followRedirects: false };
}

/**
 * Download one statement to ~/Downloads. Runs detached, so it finishes even if Raycast closes.
 * Resolves with the file path.
 */
export async function downloadStatement(
  login: MercuryLogin,
  /** The account's name, for the filename: "Mercury Checking 7791" or "Treasury". */
  label: string,
  statement: Statement,
  options: { quiet?: boolean } = {},
): Promise<string> {
  // Downloads go through curl, which raycast-faker can't replay; refuse rather than reach Mercury.
  if (isReplaying()) {
    const error = new Error("Downloads are off while raycast-faker replays");
    if (!options.quiet)
      await showToast({ style: Toast.Style.Failure, title: error.message, primaryAction: copyErrorAction(error) });
    throw error;
  }
  const target: Target = "downloads";
  const directory = join(homedir(), "Downloads");
  mkdirSync(directory, { recursive: true });
  const name = statementTitle(statement);
  const toast = options.quiet
    ? undefined
    : await showToast({ style: Toast.Style.Animated, title: `Downloading ${name}` });

  let outputPath: string | undefined;
  let ticket;
  try {
    const source = await resolveSource(login, statement.downloadUrl);
    outputPath = uniquePath(directory, statementFilename(label, statement), { reserve: true });
    ticket = await startDownload({
      url: source.url,
      outputPath,
      headers: source.headers,
      followRedirects: source.followRedirects,
      meta: { statementId: statement.id, target },
    });
  } catch (error) {
    if (outputPath) releaseReservation(outputPath);
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't start the download";
      toast.message = isDownloadError(error) ? error.message : String(error);
      toast.primaryAction = copyErrorAction(toast.message);
    }
    throw error;
  }

  return new Promise<string>((resolve, reject) => {
    watchStatus(ticket.id, {
      onChange: (status) => {
        if (toast) toast.message = formatProgressLine(status);
      },
      onSettled: async (status) => {
        if (status.state === "completed") {
          await statementHistory().add({
            id: status.id,
            filename: status.filename,
            outputPath: status.outputPath,
            status: "completed",
            bytesDownloaded: status.bytesDownloaded,
            meta: { statementId: statement.id, target },
          });
          if (toast) {
            toast.style = Toast.Style.Success;
            toast.title = `Downloaded ${name}`;
            toast.message = status.filename;
            toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(status.outputPath) };
            toast.secondaryAction = { title: "Open", onAction: () => open(status.outputPath) };
          }
          resolve(status.outputPath);
          return;
        }
        // Log the typed code, never the URL: a download link can be a bearer credential.
        log.error("Statement download failed", { code: status.error?.code, httpStatus: status.error?.httpStatus });
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = status.state === "cancelled" ? "Download cancelled" : "Download failed";
          toast.message = status.error?.message;
          toast.primaryAction = copyErrorAction(status.error?.message ?? toast.title);
        }
        reject(new Error(status.error?.message ?? "Download failed"));
      },
      onMissing: () => {
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = "Download status went missing";
          toast.primaryAction = copyErrorAction(toast.title);
        }
        reject(new Error("Download status went missing"));
      },
      onAbandoned: () => {
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = "Download interrupted";
          toast.primaryAction = copyErrorAction(toast.title);
        }
        reject(new Error("Download interrupted"));
      },
    });
  });
}

export interface LocalCopies {
  /** A copy the user saved to Downloads: this is what marks a statement as downloaded. */
  downloads?: string;
}

/** Statement copies that still exist on disk, by statement ID. */
export async function localStatementCopies(): Promise<Map<string, LocalCopies>> {
  // A download that finished after Raycast closed was never recorded by its watcher; the
  // downloader's status files still have it, so fold those in first.
  await reconcileHistory(statementHistory(), {
    toMeta: (status) => status.meta as { statementId: string; target: Target } | undefined,
  }).catch((error) => log.log("Couldn't reconcile downloads:", String(error)));
  const copies = new Map<string, LocalCopies>();
  const records = (await statementHistory().list()).sort((a, b) => b.timestamp - a.timestamp);
  for (const record of records) {
    const id = record.meta?.statementId;
    if (record.status !== "completed" || !id || !existsSync(record.outputPath)) continue;
    const entry = copies.get(id) ?? {};
    if (record.meta?.target === "downloads") entry.downloads ??= record.outputPath;
    copies.set(id, entry);
  }
  return copies;
}
