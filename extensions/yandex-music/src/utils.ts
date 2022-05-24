import { runAppleScript } from "run-applescript";
import { Application, getPreferenceValues, showHUD } from "@raycast/api";

// May work in other browser too, but it's confirmed to work only in these
type SupportedBrowsers = "Safari" | "Chrome" | "Yandex";

interface OsaError {
  stderr: string;
}

function runJS(browser: SupportedBrowsers | string, code: string): string {
  if (browser === "Safari") {
    return `tell t to do javascript "${code}"`;
  } else {
    return `tell t to execute javascript "${code}"`;
  }
}

export async function runJSInYandexMusicTab(code: string) {
  const browser = getPreferenceValues<{ browser: Application }>().browser;

  try {
    await runAppleScript(`
            tell application "${browser.name}"
                repeat with w in (every window)		
                    repeat with t in (every tab whose URL contains "music.yandex.ru") of w			
                        ${runJS(browser.name, code)}
                    end repeat	
                end repeat
            end tell
        `);
  } catch (e) {
    const message = (e as OsaError).stderr;

    if (message.includes("Allow JavaScript from Apple Events")) {
      showHUD(
        `You must enable the 'Allow JavaScript from Apple Events' option in ${browser.name}'s Develop menu to use extension`
      );
    }
  }
}
