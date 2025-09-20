// modified from https://github.com/raycast/extensions/blob/main/extensions/eagle/src/utils/checkInstall.ts

import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isRelaGitInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.relagit.app");
}

export async function checkRelaInstallation() {
  if (!(await isRelaGitInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "RelaGit is not installed.",
      message: "Install it from: https://rela.dev",
      primaryAction: {
        title: "Go to https://rela.dev",
        onAction: (toast) => {
          open("https://rela.dev");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
