import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Read the installed version's translations rather than assuming the app runs in English.
export async function readMenuTitles(appPath: string, keys: string[]): Promise<string[]> {
  const resources = path.join(appPath, "Contents", "Resources");
  const locales = (await readdir(resources)).filter((name) => name.endsWith(".lproj"));
  const results = await Promise.allSettled(
    locales.map(async (locale) => {
      const { stdout } = await execFileAsync(
        "/usr/bin/plutil",
        ["-convert", "json", "-o", "-", path.join(resources, locale, "Localizable.strings")],
        { timeout: 3000, maxBuffer: 2 * 1024 * 1024 },
      );
      const values: Record<string, unknown> = JSON.parse(stdout);
      return keys
        .map((key) => values[key])
        .filter((title): title is string => typeof title === "string" && title.length > 0);
    }),
  );
  const titles = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  if (!titles.length)
    throw new Error("Screenflare’s menu resources could not be read. Update or reinstall Screenflare.");
  return [...new Set(titles)];
}

// Inputs are argv, never interpolated into AppleScript source. Only exact, enabled menu items are invoked.
export const menuScript = `
on run candidateTitles
  tell application "System Events"
    if UI elements enabled is false then error "SF_ACCESSIBILITY"
  end tell
  tell application id "app.screenflare" to activate
  tell application "System Events"
    set targetProcess to first application process whose bundle identifier is "app.screenflare"
    set frontmost of targetProcess to true
    repeat 30 times
      if exists menu bar 1 of targetProcess then exit repeat
      delay 0.1
    end repeat
    if not (exists menu bar 1 of targetProcess) then error "SF_MENU_MISSING"
    tell targetProcess
      set foundDisabled to false
      repeat with barItem in menu bar items of menu bar 1
        if exists menu 1 of barItem then
          repeat with candidateTitle in candidateTitles
            set matches to (menu items of menu 1 of barItem whose name is (contents of candidateTitle))
            repeat with targetItem in matches
              if enabled of targetItem then
                click targetItem
                return "invoked"
              else
                set foundDisabled to true
              end if
            end repeat
          end repeat
        end if
      end repeat
      if foundDisabled then error "SF_DISABLED"
      error "SF_MENU_MISSING"
    end tell
  end tell
end run
`;

export function explainMenuError(error: unknown): { title: string; message: string; permission?: boolean } {
  const message = error instanceof Error ? error.message : String(error);
  if (/SF_ACCESSIBILITY|not allowed assistive|not authorized|not permitted|-1743|-25211|1002/i.test(message)) {
    return {
      title: "Allow Raycast to control Screenflare",
      message:
        "Enable Raycast in Privacy & Security → Accessibility. Allow Raycast → System Events under Automation if macOS asks.",
      permission: true,
    };
  }
  if (message.includes("SF_DISABLED")) {
    return {
      title: "Action unavailable right now",
      message:
        "Screenflare disabled this menu item. For recording controls, start a recording first; for capture, finish the current task or dialog.",
    };
  }
  if (message.includes("SF_MENU_MISSING")) {
    return {
      title: "Screenflare menu is unavailable",
      message:
        "Finish Screenflare’s setup and close modal dialogs, then try again. This extension targets Screenflare 0.1.24’s native menus.",
    };
  }
  return { title: "Could not control Screenflare", message };
}
