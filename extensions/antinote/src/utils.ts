import { getApplications, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { BETA_DB_PATH } from "./constants";

export function getPreferBetaPreference() {
  const { preferBeta = "true" } = getPreferenceValues<Preferences>();
  return preferBeta === "true";
}

export async function checkAntinoteInstalled() {
  const applications = await getApplications();

  let installation = null;
  const preferBeta = getPreferBetaPreference();

  if (applications.some((app) => app.bundleId === "com.chabomakers.Antinote")) {
    if (preferBeta && fs.existsSync(BETA_DB_PATH)) {
      installation = { installed: true, version: "beta" };
    } else {
      installation = { installed: true, version: "standalone" };
    }
  } else if (applications.some((app) => app.bundleId === "com.chabomakers.Antinote-setapp")) {
    installation = { installed: true, version: "setapp" };
  } else {
    installation = { installed: false, version: null };
  }

  if (!installation.installed) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Antinote is not installed",
      message: "Please install Antinote from Antinote.io",
      primaryAction: {
        title: "Go to https://antinote.io",
        onAction: async (toast) => {
          await open("https://antinote.io");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return installation;
}
