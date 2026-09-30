import { join } from "node:path";
import { PathLike, existsSync } from "node:fs";
import { Toast, getApplications, open, showToast } from "@raycast/api";
import { execSync } from "node:child_process";

export async function showInstallToast() {
  const installToast: Toast.Options = {
    style: Toast.Style.Failure,
    title: "Privileges.app is not installed.",
    message: "Install it from: https://github.com/SAP/macOS-enterprise-privileges",
    primaryAction: {
      title: "Go to https://github.com/SAP/macOS-enterprise-privileges",
      onAction: (toast) => {
        open("https://github.com/SAP/macOS-enterprise-privileges");
        toast.hide();
      },
    },
  };
  await showToast(installToast);
}

export async function getPrivilegesClient() {
  const privilegesApp = (await getApplications()).find((app) => app.bundleId === "corp.sap.privileges");
  if (!privilegesApp) {
    return null;
  }
  const v2CliPath = join(privilegesApp.path, "Contents", "MacOS", "PrivilegesCLI");
  if (!existsSync(v2CliPath)) {
    const v1CliPath = join(privilegesApp.path, "Contents", "Resources", "PrivilegesCLI");
    if (!existsSync(v1CliPath)) {
      return null;
    }
    return new PrivilegesClient(v1CliPath);
  }
  return new PrivilegesClient(v2CliPath);
}

class PrivilegesClient {
  constructor(private cliPath: PathLike) {}

  public async grant() {
    execSync(`${this.cliPath} --add`);
  }

  public async revoke() {
    execSync(`${this.cliPath} --remove`);
  }
}
