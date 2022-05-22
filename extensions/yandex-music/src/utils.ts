import { runAppleScript } from "run-applescript";
import { Application, getPreferenceValues } from "@raycast/api";

export async function runJSInYandexMusicTab(code: string) {
  const browser = getPreferenceValues<{ browser: Application }>().browser;

  await runAppleScript(`
        tell application "${browser.name}"
            repeat with w in (every window)		
                repeat with t in (every tab whose URL contains "music.yandex.ru") of w			
                    tell t to execute javascript "${code}"	
                end repeat	
            end repeat
        end tell
    `);
}
