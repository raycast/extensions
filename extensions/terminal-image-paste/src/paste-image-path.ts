import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { execSync, spawn } from "child_process";

function makeClipPath(): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  return `/tmp/clip-${ts}.png`;
}

export default async function main() {
  const { remoteHosts } = getPreferenceValues<Preferences.PasteImagePath>();
  const clipPath = makeClipPath();

  const saveScript = `
set clipData to (the clipboard as «class PNGf»)
set fp to open for access POSIX file "${clipPath}" with write permission
set eof fp to 0
write clipData to fp
close access fp
`.trim();

  try {
    execSync(`osascript -e '${saveScript.replace(/'/g, "'\\''")}'`, {
      timeout: 5000,
    });
  } catch {
    await showHUD("❌ No image in clipboard");
    return;
  }

  await Clipboard.paste(clipPath);

  const hosts = remoteHosts
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  for (const host of hosts) {
    spawn("scp", ["-q", "-o", "ConnectTimeout=3", clipPath, `${host}:${clipPath}`], {
      detached: true,
      stdio: "ignore",
    }).unref();
  }

  const hostInfo = hosts.length > 0 ? ` → ${hosts.join(", ")}` : "";
  await showHUD(`✅ ${clipPath}${hostInfo}`);
}
