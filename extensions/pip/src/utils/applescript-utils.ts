import { runAppleScript } from "@raycast/utils";
import { captureException } from "@raycast/api";
import { isNotEmpty } from "./common-utils";

// pip mode

const pipJavascript = `
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
}
`;

const scriptPipChromium = (browser: string) => `
tell application "${browser}"
  activate
  if (count of windows) is 0 then
    make new window
  end if
  tell active tab of first window to execute javascript "${pipJavascript}"
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
  activate
  if (count of windows) is 0 then
    make new window
  end if
  tell window 1
    set currentTab to current tab
    tell currentTab to do JavaScript "${pipJavascript}"
  end tell
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

const scriptPipIina = () => `
tell application "IINA"
	activate
	tell application "System Events"
		keystroke "p" using {control down, command down}
	end tell
end tell
`;

export const pipIina = async () => {
  try {
    return await runAppleScript(scriptPipIina());
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};

// fullscreen mode

const fullscreenJavascript = `
var video = document.querySelector('video');
if (video) {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        console.log('Exiting Fullscreen');
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => console.error('Error exiting Fullscreen:', err));
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen().catch(err => console.error('Error exiting Fullscreen:', err));
        }
    } else {
        console.log('Entering Fullscreen');
        if (video.requestFullscreen) {
            video.requestFullscreen().catch(err => console.error('Error entering Fullscreen:', err));
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen().catch(err => console.error('Error entering Fullscreen:', err));
        }
    }
} else {
    console.log('No video element found');
}
`;

const scriptFullscreenChromium = (browser: string) => `
tell application "${browser}"
  activate
  if (count of windows) is 0 then
    make new window
  end if
  tell active tab of first window to execute javascript "${fullscreenJavascript}"
return
end tell
`;

export const fullscreenChromium = async (browser: string) => {
  try {
    return await runAppleScript(scriptFullscreenChromium(browser));
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};

const scriptFullscreenWebkit = (browser: string) => `
tell application "${browser}"
  activate
  if (count of windows) is 0 then
    make new window
  end if
  tell window 1
    set currentTab to current tab
    tell currentTab to do JavaScript "${fullscreenJavascript}"
  end tell
return
end tell
`;

export const fullscreenWebkit = async (browser: string) => {
  try {
    return await runAppleScript(scriptFullscreenWebkit(browser));
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};

export const fullscreenBrowserVideo = async (browser: string) => {
  const retChromium = await fullscreenChromium(browser);
  if (isNotEmpty(retChromium)) {
    const retWebkit = await fullscreenWebkit(browser);
    if (isNotEmpty(retWebkit)) {
      return `${retWebkit}\n${retChromium}`;
    } else {
      return retWebkit;
    }
  }
  return retChromium;
};

const scriptFullscreenIina = () => `
tell application "IINA"
	activate
	tell application "System Events"
		keystroke "f" using {control down, command down}
	end tell
end tell
`;

export const fullscreenIina = async () => {
  try {
    return await runAppleScript(scriptFullscreenIina());
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};
