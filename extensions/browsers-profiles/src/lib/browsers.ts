import { exec } from "child_process";

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
  exec(`open -n -a "${app}" --args --profile-directory="${profile}"`);
};

/*****************************************************************************
 * Launch Firefox browsers
 ****************************************************************************/
export const launchFirefox = (app: string, profile: string) => {
  exec(`${app} -P --no-remote ${profile}`);
};
