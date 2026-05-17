import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

/**
 * Posts an NSDistributedNotificationCenter notification to Uttero.
 * Uttero receives it in the background without activating — no window flash, no focus stealing.
 * Uses AppleScript ObjC bridge to call Foundation directly.
 */
export function sendUtteroCommand(action: string, params: Record<string, string> = {}): void {
  const allParams = { action, ...params };
  // Build AppleScript lists for NSMutableDictionary — avoid record syntax ({key:val}) which
  // breaks when the key name conflicts with AppleScript reserved words (e.g. "center").
  const keys = Object.keys(allParams)
    .map((k) => `"${k}"`)
    .join(", ");
  const vals = Object.values(allParams)
    .map((v) => `"${v}"`)
    .join(", ");

  const script = `use framework "Foundation"
set nc to current application's NSDistributedNotificationCenter's defaultCenter()
set d to current application's NSMutableDictionary's dictionaryWithObjects:{${vals}} forKeys:{${keys}}
nc's postNotificationName:"app.uttero.command" object:(missing value) userInfo:d deliverImmediately:true`;

  const tmpFile = `/tmp/uttero-cmd-${Date.now()}.applescript`;
  writeFileSync(tmpFile, script);
  try {
    execSync(`osascript "${tmpFile}"`, { timeout: 3000, stdio: "pipe" });
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {}
  }
}

export function isUtteroRunning(): boolean {
  try {
    execSync("pgrep -x Uttero", { timeout: 1000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
