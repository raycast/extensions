import { runAppleScript } from "@raycast/utils";
import { captureException } from "@raycast/api";
import { isEmpty, isNotEmpty } from "./common-utils";
import { VideoActionType } from "./constants";
import { simulateKeyboard } from "./types";

// simulate keyboard event to allow running javascript
const scriptSimulateKeyboardEvent = () => {
  if (isEmpty(simulateKeyboard)) {
    return ``;
  } else {
    let keystroke;
    if (simulateKeyboard.startsWith("key code")) {
      keystroke = simulateKeyboard;
    } else {
      keystroke = `keystroke "${simulateKeyboard}"`;
    }
    return `tell application "System Events"
       ${keystroke}
     end tell
     delay 0.1`;
  }
};

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

const chromiumAppleScript = (browser: string, action: VideoActionType) => {
  const actionJavascript = action === VideoActionType.Pip ? pipJavascript : fullscreenJavascript;
  return `
tell application "${browser}"
  activate
  if (count of windows) is 0 then
    make new window
  end if
  ${scriptSimulateKeyboardEvent()}
  tell active tab of first window to execute javascript "${actionJavascript}"
return
end tell
`;
};

const webkitAppleScript = (browser: string, action: VideoActionType) => {
  const actionJavascript = action === VideoActionType.Pip ? pipJavascript : fullscreenJavascript;
  return `
tell application "${browser}"
  activate
  if (count of windows) is 0 then
    make new window
  end if
  tell window 1
    set currentTab to current tab
    tell currentTab to do JavaScript "${actionJavascript}"
  end tell
return
end tell
`;
};

export const pipChromium = async (browser: string) => {
  try {
    return await runAppleScript(chromiumAppleScript(browser, VideoActionType.Pip));
  } catch (e) {
    console.error(e);
    return String(e);
  }
};

export const pipWebkit = async (browser: string) => {
  try {
    return await runAppleScript(webkitAppleScript(browser, VideoActionType.Pip));
  } catch (e) {
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

export const fullscreenChromium = async (browser: string) => {
  try {
    return await runAppleScript(chromiumAppleScript(browser, VideoActionType.Fullscreen));
  } catch (e) {
    console.error(e);
    return String(e);
  }
};

export const fullscreenWebkit = async (browser: string) => {
  try {
    return await runAppleScript(webkitAppleScript(browser, VideoActionType.Fullscreen));
  } catch (e) {
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

const iinaAppleScript = (action: VideoActionType) => {
  const actionAppleScript =
    action === VideoActionType.Pip
      ? `keystroke "p" using {control down, command down}`
      : `keystroke "f" using {control down, command down}`;
  return `
tell application "IINA"
	activate
	tell application "System Events"
		 ${actionAppleScript}
	end tell
end tell
`;
};

export const pipIina = async () => {
  try {
    return await runAppleScript(iinaAppleScript(VideoActionType.Pip));
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};

export const fullscreenIina = async () => {
  try {
    return await runAppleScript(iinaAppleScript(VideoActionType.Fullscreen));
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};
