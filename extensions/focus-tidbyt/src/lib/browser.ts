import { execFile } from "child_process";
import { promisify } from "util";
import { pathToFileURL } from "url";

const execFileAsync = promisify(execFile);

async function getDefaultBrowserBundleId(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", [
      "-e",
      'id of application (path to default application for "http://")',
    ]);
    const bundleId = stdout.trim();
    return bundleId.length > 0 ? bundleId : null;
  } catch {
    return null;
  }
}

export async function openUrlInDefaultBrowser(url: string): Promise<void> {
  const bundleId = await getDefaultBrowserBundleId();
  if (bundleId) {
    await execFileAsync("/usr/bin/open", ["-b", bundleId, url]);
    return;
  }
  await execFileAsync("/usr/bin/open", [url]);
}

export function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).toString();
}
