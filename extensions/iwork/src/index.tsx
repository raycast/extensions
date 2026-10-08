import { getApplications, open, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

export async function checkPagesInstalled() {
  const apps = await getApplications();
  const app = apps.find((app) => app.name == "Pages")?.name;

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Pages is not installed",
      primaryAction: {
        title: "Download Pages",
        onAction: (toast) => open("https://apps.apple.com/us/app/pages/id409201541?mt=12").then(() => toast.hide()),
      },
    });
    return false;
  }
  return true;
}

export async function checkNumbersInstalled() {
  const apps = await getApplications();
  const app = apps.find((app) => app.name == "Numbers")?.name;

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Numbers is not installed",
      primaryAction: {
        title: "Download Numbers",
        onAction: (toast) => open("https://apps.apple.com/us/app/numbers/id409203825?mt=12").then(() => toast.hide()),
      },
    });
    return false;
  }
  return true;
}

export async function checkKeynoteInstalled() {
  const apps = await getApplications();
  const app = apps.find((app) => app.name == "Keynote")?.name;

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Keynote is not installed",
      primaryAction: {
        title: "Download Keynote",
        onAction: (toast) => open("https://apps.apple.com/us/app/keynote/id409183694?mt=12").then(() => toast.hide()),
      },
    });

    return false;
  }
  return true;
}

export function resolveExportPath(exportDir: string, filename: string): string {
  // Resolves paths beginning with ~ to absolute paths
  const filepath = exportDir + (exportDir.endsWith("/") ? "" : "/") + filename;

  if (filepath.startsWith("~")) {
    const homeDir = execSync("cd ~ && pwd").toString().replace("\n", "");
    return homeDir + filepath.substring(1);
  }

  return filepath;
}
