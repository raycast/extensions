import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

let _scriptsDir: string | null = null;

/**
 * Find the directory containing the .applescript files.
 * Looks in dist/scripts/ (bundled) first, then falls back to
 * APPLESCRIPTS_DIR environment variable.
 * Lazily resolved on first call so a missing directory doesn't
 * crash the extension at module load.
 */
export function findApplescriptsDir(): string {
  if (_scriptsDir) return _scriptsDir;

  const envDir = process.env.APPLESCRIPTS_DIR;
  if (envDir && fs.existsSync(envDir)) {
    _scriptsDir = envDir;
    return envDir;
  }

  const candidates = [
    path.resolve(__dirname, "scripts"), // bundled in dist/scripts/
    path.resolve(__dirname, "..", "assets", "scripts"), // dev: from src/ to assets/scripts/
    path.resolve(__dirname, "..", "scripts"), // dev: from dist/ to scripts/
  ];

  for (const dir of candidates) {
    const testFile = path.join(dir, "ntfctl-clear.applescript");
    if (fs.existsSync(testFile)) {
      _scriptsDir = dir;
      return dir;
    }
  }

  throw new Error(
    "Could not find AppleScript files. Set APPLESCRIPTS_DIR to the directory containing ntfctl-clear.applescript.",
  );
}

/**
 * Run an AppleScript file and return stdout.
 */
export function runAppleScript(scriptName: string): string {
  const dir = findApplescriptsDir();
  const scriptPath = path.join(dir, scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  return execSync(`osascript "${scriptPath}"`, {
    encoding: "utf-8",
    timeout: 15_000,
  }).trim();
}

export interface NotificationItem {
  app: string;
  title: string;
  body: string;
}

/**
 * Reads every notification currently visible in Notification Center via
 * Accessibility UI scripting: opens Notification Center, walks the AX tree
 * grouping `AXStaticText` elements into (app, title, body) triples by their
 * vertical position, then closes Notification Center again.
 *
 * Returns an empty array when there are no notifications. Throws if the UI
 * scripting itself fails (e.g. missing Accessibility permission).
 */
export function fetchNotifications(): NotificationItem[] {
  const raw = execSync(
    `osascript -e '
    tell application "System Events"
      tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
      end tell
      delay 0.8
      set errResult to ""
      set output to ""
      set itemCount to 0
      tell process "NotificationCenter"
        try
          set ncWindow to item 1 of (every window)
        on error errMsg
          set errResult to "ERR:NoWindow:" & errMsg
        end try
        if errResult is "" then
          try
            set allEls to entire contents of ncWindow
          on error errMsg
            set errResult to "ERR:EntireContents:" & errMsg
          end try
        end if
        if errResult is "" then
          set appName to ""
          set notifTitle to ""
          set notifBody to ""
          set foundApp to false
          set foundTitle to false
          repeat with el in allEls
            if role of el is "AXStaticText" then
              try
                set t to value of el
                if t is not missing value and t is not "" then
                  set elemPos to position of el
                  set elemY to item 2 of elemPos
                  if elemY > 40 then
                    if not foundApp then
                      set appName to t
                      set foundApp to true
                    else if not foundTitle then
                      set notifTitle to t
                      set foundTitle to true
                    else if notifBody is "" then
                      set notifBody to t
                      set itemCount to itemCount + 1
                      set output to output & appName & "|||" & notifTitle & "|||" & notifBody & "\\n"
                      set appName to ""
                      set notifTitle to ""
                      set notifBody to ""
                      set foundApp to false
                      set foundTitle to false
                    end if
                  end if
                end if
              end try
            end if
          end repeat
        end if
      end tell
      tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
      end tell
      if errResult is not "" then
        return errResult
      end if
      if itemCount is 0 then
        return "NO_NOTIFS"
      end if
      return (itemCount as text) & "|||" & output
    end tell'`,
    { encoding: "utf-8", timeout: 15_000 },
  ).trim();

  if (raw === "NO_NOTIFS" || raw === "") return [];
  if (raw.startsWith("ERR:")) throw new Error(raw);

  const firstSeparator = raw.indexOf("|||");
  if (firstSeparator === -1) return [];

  const itemsRaw = raw.substring(firstSeparator + 3);

  return itemsRaw
    .split("\n")
    .filter(Boolean)
    .map((line): NotificationItem => {
      const parts = line.split("|||");
      return {
        app: parts[0] || "Unknown",
        title: parts[1] || "",
        body: parts[2] || "",
      };
    });
}
