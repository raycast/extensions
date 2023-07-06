import { getApplications, showToast, Toast, open } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "util";
import { DefaultPreferences } from "../constant";

const execp = promisify(exec);

async function isNumiInstalled() {
  const applications = await getApplications();
  return applications.some(
    ({ bundleId }) =>
      bundleId === "com.dmitrynikolaev.numi" ||
      bundleId === "com.nikolaeu.numi-setapp" ||
      bundleId === "com.nikolaeu.numi"
  );
}

export async function checkNumiInstallation(cli: boolean) {
  if (!cli) {
    if (!(await isNumiInstalled())) {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Numi is not installed.",
        message: "Install it from: https://numi.app/",
        primaryAction: {
          title: "Go to https://numi.app/",
          onAction: (toast) => {
            open("https://numi.app/");
            toast.hide();
          },
        },
      };

      await showToast(options);
    }
  } else {
    if (!(await isNumiCliInstalled())) {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Numi CLI is not installed.",
        message: "Install it from: https://github.com/nikolaeu/numi#numi-cli",
        primaryAction: {
          title: "Go to https://github.com/nikolaeu/numi#numi-cli",
          onAction: (toast) => {
            open("https://github.com/nikolaeu/numi#numi-cli");
            toast.hide();
          },
        },
      };

      await showToast(options);
    }
  }
}

export async function isNumiCliInstalled(path?: string) {
  try {
    const res = await execp(`${path || DefaultPreferences.numi_cli_binary_path} --version`, { shell: "/bin/bash" });
    console.log(res);
    if (res.stderr) {
      return false;
    }
    return res.stdout;
  } catch (error) {
    console.error(error);
    return false;
  }
}
