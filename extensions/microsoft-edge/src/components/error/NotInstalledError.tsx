import { useState } from "react";
import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { DEFAULT_ERROR_TITLE } from "../../constants";
import { cpus } from "os";
import { join } from "path";
import { ExecError } from "../../types/interfaces";
import { getDownloadText } from "../../utils/messageUtils";
import { isStableVersion } from "../../utils/appUtils";

export const brewPrefix: string = (() => {
  try {
    return execSync("brew --prefix", { encoding: "utf8" }).trim();
  } catch {
    return cpus()[0].model.includes("Apple") ? "/opt/homebrew" : "/usr/local";
  }
})();

export function brewExecutable(): string {
  return join(brewPrefix, "bin/brew");
}

function execBrew(cask: string) {
  try {
    return execSync(`${brewExecutable()} install --cask ${cask}`, { maxBuffer: 10 * 1024 * 1024 });
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr && execErr.code === 127) {
      execErr.stderr = `Brew executable not found at ${brewExecutable()}`;
      throw execErr;
    } else {
      throw err;
    }
  }
}

export function NotInstalledError() {
  const [showAction, setShowAction] = useState(isStableVersion());

  return (
    <Detail
      actions={
        <ActionPanel>
          {showAction && (
            <Action
              title="Install with Homebrew"
              onAction={async () => {
                if (!showAction) return;
                setShowAction(false);
                const toast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
                await toast.show();
                try {
                  execBrew("microsoft-edge"); // No cask versions available for Edge Insider builds yet
                  await toast.hide();
                } catch (e) {
                  setShowAction(true);
                  await toast.hide();
                  await showToast(
                    Toast.Style.Failure,
                    DEFAULT_ERROR_TITLE,
                    "An unknown error occurred while trying to install"
                  );
                }
                toast.title = "Installed! Please go back and try again.";
                toast.style = Toast.Style.Success;
                await toast.show();
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={getDownloadText()}
    />
  );
}
