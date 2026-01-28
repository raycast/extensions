import { getApplications, showToast, Toast, open } from "@raycast/api";
import { readdir } from "fs/promises";

// 新增检查 Setapp 目录的函数
async function isMindNodeInstalledInSetapp() {
  const setappApplicationsPath = "/Applications/Setapp";
  try {
    const files = await readdir(setappApplicationsPath);
    return files.some((file) => file.includes("MindNode"));
  } catch (error) {
    console.error("Error reading Setapp applications directory:", error);
    return false;
  }
}

async function isMindNodeInstalled() {
  const applications = await getApplications();
  const isInstalledRegular = applications.some(
    ({ bundleId }) =>
      bundleId === "com.ideasoncanvas.mindnode.macos-setapp" || bundleId === "com.ideasoncanvas.mindnode.macos",
  );
  const isInstalledSetapp = await isMindNodeInstalledInSetapp();
  return isInstalledRegular || isInstalledSetapp;
}

export async function checkMindnodeInstallation(): Promise<boolean> {
  const isInstalled = await isMindNodeInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "MindNode is not installed.",
      message: "Check it more from: https://mindnode.com",
      primaryAction: {
        title: "Go to App Store",
        onAction: (toast) => {
          open("https://apps.apple.com/app/apple-store/id1289197285?pt=14265&ct=web-main&mt=8");
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Go to Setapp",
        onAction: (toast) => {
          open("https://setapp.com/apps/mindnode");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}
