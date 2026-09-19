import {
  Icon,
  closeMainWindow,
  open,
  showHUD,
  showToast,
  Toast,
  type Application,
} from "@raycast/api";
import path from "path";
import {
  extractDomainFromText,
  findDownload,
  guessDomainFromText,
  SITE_TABLE,
  type FileCandidate,
} from "./candidates";
import { NONE, OTHER, type InterpretResult } from "./typesafe";

export interface ResolvedAction {
  title: string;
  subtitle: string;
  icon: Icon;
  run: () => Promise<void>;
}

export interface UnresolvedAction {
  reason: string;
}

export function isResolved(
  action: ResolvedAction | UnresolvedAction,
): action is ResolvedAction {
  return "run" in action;
}

async function openAndConfirm(target: string, label: string): Promise<void> {
  try {
    await open(target);
    await closeMainWindow();
    await showHUD(`Opened ${label}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open it",
      message: String(error),
    });
  }
}

/**
 * Turns a TypeSafe interpretation into one concrete, runnable action (or an
 * explanation why not). We deliberately don't gate on `actionConfidence`
 * here: Jev reports lower confidence for perfectly valid requests it's
 * merely less familiar with (e.g. a less common app name), and the real
 * signal for "give up" is either an explicit `unsupported` classification
 * or a branch failing to resolve to an actual candidate.
 */
export async function resolveAction(
  query: string,
  result: InterpretResult,
  apps: Application[],
  fileCandidates: FileCandidate[],
): Promise<ResolvedAction | UnresolvedAction> {
  switch (result.action) {
    case "open_download": {
      const file = await findDownload(result.fileType, result.downloadRank);
      if (!file) {
        const kind = result.fileType === "any" ? "" : `${result.fileType} `;
        return { reason: `No matching ${kind}download found in ~/Downloads.` };
      }
      const name = path.basename(file.absolutePath);
      const rankLabel =
        result.downloadRank === "oldest"
          ? "Oldest matching download"
          : result.downloadRank === "newest"
            ? "Most recent matching download"
            : `${result.downloadRank.replace("_", " ")} matching download`;
      return {
        title: `Open ${name}`,
        subtitle: rankLabel,
        icon: Icon.Download,
        run: () => openAndConfirm(file.absolutePath, name),
      };
    }

    case "open_app": {
      if (result.appName === NONE)
        return { reason: "Couldn't tell which app you mean." };
      const app = apps.find((a) => a.name === result.appName);
      if (!app) return { reason: "Couldn't tell which app you mean." };
      return {
        title: `Open ${app.name}`,
        subtitle: app.path,
        icon: Icon.AppWindow,
        run: () => openAndConfirm(app.path, app.name),
      };
    }

    case "open_file": {
      if (result.fileCandidate === NONE)
        return { reason: "Couldn't find a matching file." };
      const file = fileCandidates.find((f) => f.label === result.fileCandidate);
      if (!file) return { reason: "Couldn't find a matching file." };
      const name = path.basename(file.absolutePath);
      return {
        title: `Open ${name}`,
        subtitle: file.label,
        icon: Icon.Finder,
        run: () => openAndConfirm(file.absolutePath, name),
      };
    }

    case "open_url": {
      // Deterministic parsing first: if the text already names an explicit URL/domain,
      // trust that over the model's pick. Then the curated table (for sites whose
      // canonical URL isn't just "<name>.com"). Last resort: guess "<word>.com" for an
      // unambiguous single-word brand name neither of those caught.
      const url =
        extractDomainFromText(query) ??
        (result.siteName !== OTHER ? SITE_TABLE[result.siteName] : null) ??
        guessDomainFromText(query);
      if (!url) return { reason: "Couldn't tell which site you mean." };
      return {
        title: `Open ${url}`,
        subtitle: "In your default browser",
        icon: Icon.Globe,
        run: () => openAndConfirm(url, url),
      };
    }

    case "unsupported":
    default:
      return { reason: "Not sure what you mean — try rephrasing." };
  }
}
