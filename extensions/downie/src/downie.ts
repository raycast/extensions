import { Application, getApplications } from "@raycast/api";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import { buildDownieURL, DownloadOptions } from "./urls";
const execute = promisify(execFile);

export async function findDownie(): Promise<Application> {
  const apps = await getApplications();
  const app =
    apps.find((app) => app.bundleId === "com.charliemonroe.Downie-4") ??
    apps.find((app) => app.name === "Downie" || app.name === "Downie 4");
  if (!app) throw new Error("Install Downie 4 or the Setapp edition of Downie first.");
  return app;
}

export async function sendLinks(links: string[], options: DownloadOptions): Promise<number> {
  if (options.destination) {
    const destination = await stat(options.destination).catch(() => null);
    if (!destination?.isDirectory()) throw new Error("Choose an existing destination folder.");
  }
  const app = await findDownie();
  let sent = 0;
  for (const link of links) {
    try {
      await execute("/usr/bin/open", ["-a", app.path, buildDownieURL(link, options)]);
    } catch {
      throw new Error(
        `Sent ${sent} of ${links.length} links before sending stopped. Check Downie before retrying the remaining links.`,
      );
    }
    sent++;
  }
  return sent;
}
