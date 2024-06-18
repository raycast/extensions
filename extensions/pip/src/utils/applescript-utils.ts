import { runAppleScript } from "@raycast/utils";
import { captureException } from "@raycast/api";
import { isNotEmpty } from "./common-utils";

const scriptPipChromium = (browser: string) => `
tell application "${browser}"
\tactivate
\tif (count of windows) is 0 then
\t\tmake new window
\tend if
\ttell active tab of first window to execute javascript "
                var video = document.querySelector('video');
                if (video) {
                    if (document.pictureInPictureElement) {
                        console.log('Exiting Picture-in-Picture');
                        document.exitPictureInPicture().catch(err => console.error('Error exiting Picture-in-Picture:', err));
                    } else {
                        console.log('Entering Picture-in-Picture');
                        video.requestPictureInPicture().catch(err => console.error('Error entering Picture-in-Picture:', err));
                    }
                } else {
                    console.log('No video element found');
                }"
return
end tell
`;
export const pipChromium = async (browser: string) => {
  try {
    return await runAppleScript(scriptPipChromium(browser));
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};

const scriptPipWebkit = (browser: string) => `
tell application "${browser}"
\tactivate
\tif (count of windows) is 0 then
\t\tmake new window
\tend if
\ttell window 1
\t\tset currentTab to current tab
\t\ttell currentTab to do JavaScript "
                var video = document.querySelector('video');
                if (video) {
                    if (document.pictureInPictureElement) {
                        console.log('Exiting Picture-in-Picture');
                        document.exitPictureInPicture().catch(err => console.error('Error exiting Picture-in-Picture:', err));
                    } else {
                        console.log('Entering Picture-in-Picture');
                        video.requestPictureInPicture().catch(err => console.error('Error entering Picture-in-Picture:', err));
                    }
                } else {
                    console.log('No video element found');
                }"
\tend tell
return
end tell
`;
export const pipWebkit = async (browser: string) => {
  try {
    return await runAppleScript(scriptPipWebkit(browser));
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};

export const pipBrowserVideo = async (browser: string) => {
  const retChromium = await pipChromium(browser);
  if (isNotEmpty(retChromium)) {
    const retWebkit = await pipWebkit(browser);
    if (isNotEmpty(retWebkit)) {
      return `${retWebkit}\n${retChromium}`;
    } else {
      return retWebkit;
    }
  }
  return retChromium;
};

const scriptIina = () => `
tell application "IINA"
	activate
	tell application "System Events"
		keystroke "p" using {control down, command down}
	end tell
end tell
`;

export const pipIina = async () => {
  try {
    return await runAppleScript(scriptIina());
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};
