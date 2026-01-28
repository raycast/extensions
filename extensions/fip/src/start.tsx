import { closeMainWindow, getPreferenceValues, LaunchProps, LocalStorage, showHUD } from "@raycast/api";
import { RADIOS } from "./constants";
import { getRadioByName } from "./utils/utils";
import { runAppleScript } from "run-applescript";
import { APP } from "./types";

function startStream(url: string, app: APP = "QuickTime Player"): Promise<string> {
  return new Promise((resolve, reject) => {
    let appleScript: string;
    if (app === "QuickTime Player") {
      appleScript = `
        tell application "System Events"
          set isRunning to (name of processes) contains "QuickTime Player"
        end tell
        
        if isRunning then
          tell application "QuickTime Player"
            if exists (document 1) then
              close document 1
            end if
            open URL "${url}"
            activate
          end tell
        else
          tell application "QuickTime Player"
            open URL "${url}"
            activate
          end tell
        end if
      `;
    } else {
      // for VLC
      appleScript = `
      tell application "VLC"
          activate
          OpenURL "${url}"
        end tell
      `;
    }
    runAppleScript(appleScript)
      .then(() => {
        resolve("FIP radio stream successfully started");
      })
      .catch((e) => {
        reject(`Failed to start FIP radio stream : ${e}`);
      });
  });
}

export interface LaunchContext {
  url: string;
}

export interface CommandProps extends LaunchProps {
  launchContext: LaunchContext;
}

interface Preferences {
  defaultRadio: string;
  defaultApp: APP;
}

export default async ({ launchContext }: CommandProps) => {
  const preferences = getPreferenceValues<Preferences>();
  const defaultRadio = getRadioByName(preferences.defaultRadio);
  const fipRadio = RADIOS[0].url;
  const radioUrl = launchContext?.url || defaultRadio?.url || fipRadio;
  const defaultApp = preferences.defaultApp || "QuickTime Player";
  await closeMainWindow();
  const res = await startStream(radioUrl, defaultApp);
  // Store currently playing radio into Storage
  const radio = RADIOS.find((r) => r.url === radioUrl);
  if (radio) {
    await LocalStorage.setItem("currently-playing-radio", radio.id);
  }
  await LocalStorage.setItem("default-app", defaultApp);

  showHUD(res);
};
