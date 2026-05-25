import * as fs from "fs";
import * as path from "path";
import { runShell } from "../shell";
import { InstalledApp, UpdateInfo } from "../types";
import { hasUpdate } from "../version";

interface KnownEndpoint {
  match: (app: InstalledApp) => boolean;
  fetch: (app: InstalledApp) => Promise<{
    version: string;
    notesUrl?: string;
    downloadUrl?: string;
  } | null>;
}

// VS Code-family (Cursor, Codium, Code, etc.) use update.code.visualstudio.com or product.updateUrl
const codeFamily: KnownEndpoint = {
  match: (app) =>
    /com\.(microsoft\.VSCode|exafunction\.windsurf|todesktop\.230313mzl4w4u92|codium|vscodium|cursor)/i.test(
      app.bundleId,
    ) || /^(Visual Studio Code|Cursor|VSCodium|Code)$/i.test(app.name),
  fetch: async (app) => {
    // Try reading product.json for update URL + commit
    const productPath = path.join(
      app.appPath,
      "Contents/Resources/app/product.json",
    );
    if (!fs.existsSync(productPath)) return null;
    try {
      const product = JSON.parse(fs.readFileSync(productPath, "utf8"));
      const updateUrl: string = product.updateUrl;
      const quality: string = product.quality ?? "stable";
      const commit: string | undefined = product.commit;
      if (!updateUrl || !commit) return null;
      const arch = process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
      const url = `${updateUrl}/api/update/${arch}/${quality}/${commit}`;
      const { stdout } = await runShell(
        `/usr/bin/curl -sL --max-time 10 "${url}"`,
      );
      if (!stdout || stdout.trim() === "") return null;
      const data = JSON.parse(stdout);
      if (!data?.productVersion) return null;
      return {
        version: data.productVersion,
        notesUrl: data.url,
        downloadUrl: data.url,
      };
    } catch {
      return null;
    }
  },
};

const slack: KnownEndpoint = {
  match: (app) => /com\.tinyspeck\.slackmacgap/i.test(app.bundleId),
  fetch: async (app) => {
    const url = `https://slack.com/desktop/version-check?lversion=${encodeURIComponent(app.version)}&platform=mac`;
    try {
      const { stdout } = await runShell(
        `/usr/bin/curl -sL --max-time 10 "${url}"`,
      );
      const data = JSON.parse(stdout);
      if (data?.url && data?.version)
        return { version: data.version, downloadUrl: data.url };
      return null;
    } catch {
      return null;
    }
  },
};

const discord: KnownEndpoint = {
  match: (app) => /com\.hnc\.Discord/i.test(app.bundleId),
  fetch: async (app) => {
    const url = `https://discord.com/api/updates/stable?platform=osx&version=${encodeURIComponent(app.version)}`;
    try {
      const { stdout } = await runShell(
        `/usr/bin/curl -sL --max-time 10 "${url}"`,
      );
      const data = JSON.parse(stdout);
      if (data?.name && data.name !== app.version) {
        return { version: data.name, downloadUrl: data.url };
      }
      return null;
    } catch {
      return null;
    }
  },
};

const ENDPOINTS = [codeFamily, slack, discord];

export async function checkElectron(
  app: InstalledApp,
): Promise<UpdateInfo | null> {
  if (!app.isElectron && !ENDPOINTS.some((e) => e.match(app))) return null;
  const endpoint = ENDPOINTS.find((e) => e.match(app));
  if (!endpoint) return null;
  const result = await endpoint.fetch(app);
  if (!result) return null;
  return {
    app,
    source: "electron",
    latestVersion: result.version,
    hasUpdate: hasUpdate(app.version, app.buildNumber, result.version),
    releaseNotesUrl: result.notesUrl,
    downloadUrl: result.downloadUrl,
    checkedAt: Date.now(),
  };
}
