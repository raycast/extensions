import { getApplications, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { BETA_DB_PATH } from "./constants";

type Preferences = {
  preferBeta?: "true" | "false" | boolean;
};

export function getPreferBetaPreference() {
  const { preferBeta = "true" } = getPreferenceValues<Preferences>();
  return preferBeta === true || preferBeta === "true";
}

async function isAntinoteInstalled() {
  const applications = await getApplications();
  const preferBeta = getPreferBetaPreference();

  if (applications.some((app) => app.bundleId === "com.chabomakers.Antinote")) {
    if (preferBeta && fs.existsSync(BETA_DB_PATH)) {
      return { installed: true, version: "beta" };
    }
    return { installed: true, version: "standalone" };
  }

  if (applications.some((app) => app.bundleId === "com.chabomakers.Antinote-setapp")) {
    return { installed: true, version: "setapp" };
  }

  return { installed: false, version: null };
}

export async function checkAntinoteInstalled() {
  const installation = await isAntinoteInstalled();
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
