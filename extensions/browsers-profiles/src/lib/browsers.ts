import { exec } from "child_process";
import os from "os";

export const launchBrowser = (browserType: string, app: string, profile: string) => {
  if (browserType === "FIREFOX") {
    launchFirefox(app, profile);
  }

  if (browserType === "CHROMIUM") {
    launchChromium(app, profile);
  }
};

/*****************************************************************************
 * Launch Chromium browsers
 ****************************************************************************/
export const launchChromium = (app: string, profile: string) => {
  if (os.platform() === "win32") {
    exec(`start "" "${app}" --profile-directory="${profile}"`);
  } else {
    exec(`open -n -a "${app}" --args --profile-directory="${profile}"`);
  }
};

/*****************************************************************************
 * Launch Firefox browsers
 ****************************************************************************/
export const launchFirefox = (app: string, profile: string) => {
  const isProfilePath = profile.includes("/") || profile.includes("\\");
  const profileArg = isProfilePath ? `-profile "${profile}"` : `-P "${profile}"`;

  if (os.platform() === "win32") {
    exec(`start "" "${app}" ${profileArg}`);
  } else {
    exec(`"${app}" ${profileArg} --no-remote`);
  }
};
