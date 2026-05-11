import { getApplications, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

export default async function Command() {
  await openVivaldiIncognitoIfInstalled();
}

async function isVivaldiInstalled() {
  const applications = await getApplications();
  return applications.some((app) => app.bundleId === "com.vivaldi.Vivaldi");
}

async function openVivaldiIncognito() {
  try {
    await exec(' open -na "Vivaldi" --args -incognito "https://www.duckduckgo.com"');
  } catch (error) {
    console.error(`Error: Not working`);
    showOpenVivaldiErrorToast();
  }
}

function showVivaldiNotInstalledErrorToast() {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: "Vivaldi is not installed",
    message: "Please install Vivaldi from https://vivaldi.com",
  };
  showToast(options);
}

function showOpenVivaldiErrorToast() {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: "Failed to open Vivaldi incognito",
    message: "Please ensure that Vivaldi is installed and try again.",
  };
  showToast(options);
}

async function openVivaldiIncognitoIfInstalled() {
  const vivaldiInstalled = await isVivaldiInstalled();
  if (vivaldiInstalled) {
    await openVivaldiIncognito();
  } else {
    showVivaldiNotInstalledErrorToast();
  }
}
