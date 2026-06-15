import { Detail } from "@raycast/api";
import { execSync } from "child_process";

export default function Command() {
  const checks: { name: string; status: string; detail: string }[] = [];

  // Check 1: Can osascript run at all?
  try {
    execSync("osascript -e 'return \"OK\"'", { timeout: 5000 });
    checks.push({ name: "osascript available", status: "✅", detail: "osascript binary works" });
  } catch (e) {
    checks.push({ name: "osascript available", status: "❌", detail: String(e) });
  }

  // Check 2: Can we access System Events?
  try {
    execSync(
      `osascript -e 'tell application "System Events" to return name of first process whose name contains "Finder"'`,
      { timeout: 5000 }
    );
    checks.push({ name: "System Events access", status: "✅", detail: "Can query processes" });
  } catch (e) {
    checks.push({
      name: "System Events access",
      status: "❌",
      detail: "Cannot access System Events. Grant Accessibility to osascript.",
    });
  }

  // Check 3: Can we find NotificationCenter process?
  try {
    const result = execSync(
      `osascript -e 'tell application "System Events" to return name of first process whose name contains "Notification"'`,
      { timeout: 5000, encoding: "utf-8" }
    ).trim();
    checks.push({ name: "NotificationCenter process", status: "✅", detail: `Found: ${result}` });
  } catch (e) {
    checks.push({ name: "NotificationCenter process", status: "❌", detail: String(e) });
  }

  // Check 4: Can we read UI elements from NotificationCenter?
  try {
    const result = execSync(
      `osascript -e '
      tell application "System Events"
        tell process "ControlCenter"
          click menu bar item 2 of menu bar 1
        end tell
        delay 0.8
        tell process "NotificationCenter"
          try
            set w to item 1 of (every window)
            set c to count of (entire contents of w)
            return "OK:" & c & " elements"
          on error errMsg
            return "ERR:" & errMsg
          end try
        end tell
      end tell'`,
      { timeout: 10000, encoding: "utf-8" }
    ).trim();
    checks.push({ name: "Notification Center UI access", status: "✅", detail: result });
  } catch (e) {
    checks.push({
      name: "Notification Center UI access",
      status: "❌",
      detail: String(e),
    });
  }

  // Check 5: Can we read a notification text element?
  try {
    const result = execSync(
      `osascript -e '
      tell application "System Events"
        tell process "ControlCenter"
          click menu bar item 2 of menu bar 1
        end tell
        delay 0.8
        tell process "NotificationCenter"
          try
            set w to item 1 of (every window)
            set allEls to entire contents of w
            set foundText to "none"
            repeat with el in allEls
              if role of el is "AXStaticText" then
                try
                  set t to value of el
                  if t is not missing value and t is not "" then
                    set pos to position of el
                    if (item 2 of pos) > 40 then
                      set foundText to t
                      exit repeat
                    end if
                  end if
                end try
              end if
            end repeat
            return "OK: first text=" & foundText
          on error errMsg
            return "ERR:" & errMsg
          end try
        end tell
        tell process "ControlCenter"
          click menu bar item 2 of menu bar 1
        end tell
      end tell'`,
      { timeout: 10000, encoding: "utf-8" }
    ).trim();
    checks.push({ name: "Read notification text", status: "✅", detail: result });
  } catch (e) {
    checks.push({
      name: "Read notification text",
      status: "❌",
      detail: String(e),
    });
  }

  const md =
    "# 🔍 ntfctl Diagnostics\n\n" +
    checks.map((c) => `${c.status} **${c.name}**: ${c.detail}`).join("\n\n") +
    "\n\n---\n\n" +
    "If any check shows ❌, follow the guidance shown.\n" +
    "Common fix: add `/usr/bin/osascript` to:\n" +
    "**System Settings → Privacy & Security → Accessibility**";

  return <Detail markdown={md} />;
}
