import { getApplications } from "@raycast/api";

export const fileDownload =
  "https://github.com/DWilliames/idasen-controller/releases/latest/download/Desk.Controller.app.zip";
export const appLink = "https://github.com/DWilliames/idasen-controller-mac";

export async function isDeskControllerInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.davidwilliames.Desk-Controller");
}

export const standUp = `
  tell application "Desk Controller"
    move "to-stand"
  end tell
`;

export const sitDown = `
  tell application "Desk Controller"
    move "to-sit"
  end tell
`;
