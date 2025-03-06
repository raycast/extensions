import { getApplications, showToast, Toast, open, getPreferenceValues } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "util";
import { Preferences } from "..";

const execp = promisify(exec);
const { use_numi_cli, numi_cli_binary_path } = getPreferenceValues<Preferences>();

async function isNumiInstalled() {
  const applications = await getApplications();
  return applications.some(
    ({ bundleId }) =>
      bundleId === "com.dmitrynikolaev.numi" ||
      bundleId === "com.nikolaeu.numi-setapp" ||
      bundleId === "com.nikolaeu.numi"
  );
}

export async function checkNumiInstallation() {
  if (!use_numi_cli) {
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

export async function isNumiCliInstalled() {
  try {
    const res = await execp(`${numi_cli_binary_path} --version`, { shell: "/bin/bash" });
    if (res.stderr) return false;
    if (!res.stdout.includes("numi-cli")) return false;
    return res.stdout;
  } catch (error) {
    return false;
  }
}
