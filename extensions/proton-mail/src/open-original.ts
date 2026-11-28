import { mkdtemp, readdir, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { open, showToast, Toast } from "@raycast/api";
import { fetchOriginalHtml } from "./imap-client";
import { Email } from "./types";

// Opening the original in the browser must not run the sender's code: block scripts, frames, plugins,
// forms and redirects, and only let through what the email needs to render (images, styles, fonts)
const ORIGINAL_EMAIL_CSP = [
  "default-src 'none'",
  "img-src * data:",
  "style-src * 'unsafe-inline'",
  "font-src * data:",
  "media-src * data:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");
const ORIGINAL_FILE_PREFIX = "proton-mail-original-";
// Long enough for the browser to load the file, which holds a decrypted email
const ORIGINAL_FILE_LIFETIME_MS = 60_000;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Files left behind when the command closed before their timer fired
async function removeStaleOriginals() {
  const entries = await readdir(tmpdir());
  await Promise.all(
    entries
      .filter((entry) => entry.startsWith(ORIGINAL_FILE_PREFIX))
      .map(async (entry) => {
        const path = join(tmpdir(), entry);
        const { mtimeMs } = await stat(path);
        if (Date.now() - mtimeMs > ORIGINAL_FILE_LIFETIME_MS) {
          await rm(path, { recursive: true, force: true });
        }
      }),
  );
}

// The page gets its own charset and policy, and no <meta> tag of the email survives. A refresh is a navigation
// the policy doesn't cover, and its http-equiv value can be entity-encoded (&#114;efresh), so matching "refresh"
// isn't enough. The tags are removed, then any "<meta" still there is turned into text: removing a tag can put
// the pieces of another one together (<me<meta x>ta http-equiv=refresh …>).
export function originalEmailPage(subject: string, html: string): string {
  return (
    `<!doctype html><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${ORIGINAL_EMAIL_CSP}">` +
    `<title>${escapeHtml(subject)}</title>` +
    html.replace(/<meta\b[^>]*>/gi, "").replace(/<(?=meta\b)/gi, "&lt;")
  );
}

// Raycast can only render Markdown, so hand the original HTML to the browser for full fidelity
export async function openOriginalInBrowser(folder: string, email: Email) {
  try {
    const content = await fetchOriginalHtml(folder, email.uid);
    if (!content) {
      showToast({ style: Toast.Style.Failure, title: "No HTML version", message: "This email is plain text only" });
      return;
    }
    await removeStaleOriginals().catch(() => undefined);

    // A private, unique directory: mkdtemp creates it readable by the current user only
    const directory = await mkdtemp(join(tmpdir(), ORIGINAL_FILE_PREFIX));
    const filePath = join(directory, "email.html");
    await writeFile(filePath, originalEmailPage(email.subject, content), { mode: 0o600 });
    await open(filePath);
    setTimeout(() => rm(directory, { recursive: true, force: true }).catch(() => undefined), ORIGINAL_FILE_LIFETIME_MS);
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to open email", message: String(error) });
  }
}
