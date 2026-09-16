import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { resolveIcloudDir } from "./paths";

export const MOBILE_DOCUMENTS_DIR = path.join(
  os.homedir(),
  "Library",
  "Mobile Documents",
);

export type IcloudSetupIssue =
  "no-icloud" | "no-timeatlas" | "not-directory" | "unreadable";

export interface IcloudSetupOk {
  ok: true;
  path: string;
}

export interface IcloudSetupFail {
  ok: false;
  issue: IcloudSetupIssue;
  path: string;
  title: string;
  description: string;
}

export type IcloudSetup = IcloudSetupOk | IcloudSetupFail;

async function pathKind(
  target: string,
): Promise<"missing" | "directory" | "file" | "unreadable"> {
  try {
    const stat = await fs.stat(target);
    return stat.isDirectory() ? "directory" : "file";
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return "missing";
    }
    return "unreadable";
  }
}

/**
 * Diagnose whether Time Atlas iCloud Documents are available.
 * `override` is the optional preference path (same as resolveIcloudDir).
 */
export async function checkIcloudSetup(
  override?: string,
): Promise<IcloudSetup> {
  const trimmed = override?.trim();
  const usingOverride = Boolean(trimmed);
  const target = resolveIcloudDir(override);

  if (!usingOverride) {
    const mobileDocs = await pathKind(MOBILE_DOCUMENTS_DIR);
    if (mobileDocs === "missing") {
      return {
        ok: false,
        issue: "no-icloud",
        path: target,
        title: "iCloud Drive not available",
        description:
          "Turn on iCloud Drive in System Settings → Apple ID → iCloud, then install Time Atlas and sign in so its Documents folder appears.",
      };
    }
    if (mobileDocs === "unreadable") {
      return {
        ok: false,
        issue: "unreadable",
        path: MOBILE_DOCUMENTS_DIR,
        title: "Can’t access iCloud Drive",
        description:
          "macOS blocked reading Mobile Documents. Check iCloud Drive is enabled and that Raycast has permission to access your files.",
      };
    }
  }

  const kind = await pathKind(target);
  if (kind === "missing") {
    return {
      ok: false,
      issue: "no-timeatlas",
      path: target,
      title: "Time Atlas folder not found",
      description: usingOverride
        ? `The folder set in preferences doesn’t exist:\n${target}\n\nPick the Time Atlas iCloud Documents folder, or clear the preference to use the default.`
        : "Install Time Atlas from timeatlas.app, sign in, and wait for iCloud to create its Documents folder. Then try again.",
    };
  }
  if (kind === "file" || kind === "unreadable") {
    return {
      ok: false,
      issue: kind === "file" ? "not-directory" : "unreadable",
      path: target,
      title:
        kind === "file"
          ? "Time Atlas path is not a folder"
          : "Can’t read Time Atlas folder",
      description:
        kind === "file"
          ? `Expected a directory but found a file:\n${target}`
          : `Unable to read:\n${target}\n\nCheck folder permissions and iCloud sync status.`,
    };
  }

  return { ok: true, path: target };
}

/** Deep link into Apple ID / iCloud settings (best-effort across macOS versions). */
export const ICLOUD_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.systempreferences.AppleIDSettings";

export const TIME_ATLAS_SITE = "https://timeatlas.app";
