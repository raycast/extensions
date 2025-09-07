import { useState } from "react";
import { Action, ActionPanel, Detail, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { DEFAULT_ERROR_TITLE, DownloadText } from "../../constants";
import { cpus } from "os";
import { join } from "path";
import { ExecError } from "../../interfaces";

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
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Detail
    isLoading={isLoading}
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action
            icon={Icon.MugSteam}
              title="Install with Homebrew"
              onAction={async () => {
                if (isLoading) return;
                setIsLoading(true);
                const toast = await showToast({ style: Toast.Style.Animated, title: "Installing..." });
                try {
                  execBrew("opera");
                  toast.style = Toast.Style.Success;
                  toast.title = "Installed! Please go back and try again.";
                  await popToRoot();
                } catch {
                    toast.style = Toast.Style.Failure;
                    toast.title = DEFAULT_ERROR_TITLE;
                    toast.message = "An unknown error occurred while trying to install";
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={DownloadText}
    />
  );
}
