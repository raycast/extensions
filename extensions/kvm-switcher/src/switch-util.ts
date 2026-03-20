import { showHUD, showToast, Toast, Clipboard, open } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { environment } from "@raycast/api";

const execAsync = promisify(exec);

const envPath = 'export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"';
const brewEnv = `export HOMEBREW_NO_AUTO_UPDATE=1 && ${envPath}`;

export async function switchMonitorInput(inputCode: string | number, inputName: string) {
  // Input code has to be numeric or hex
  const sanitizedCode = String(inputCode).trim();
  if (!/^(0x)?[0-9a-fA-F]+$/.test(sanitizedCode)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Input Code",
      message: "Input code must be a valid numeric or hex value.",
    });
    return;
  }

  const switchCommand = `${envPath} && m1ddc set input ${sanitizedCode}`;

  try {
    if (process.platform === "win32") {
      const csFilePath = path.join(environment.assetsPath, "MonitorSwitcher.cs");

      const psCommand = `Add-Type -Path '${csFilePath}'; [MonitorControl]::SetInput(${sanitizedCode})`;

      const psPath = process.env.SystemRoot
        ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
        : "powershell.exe";

      await execAsync(`"${psPath}" -NoProfile -NonInteractive -Command "${psCommand}"`);
    } else {
      await execAsync(switchCommand);
    }
    await showHUD(`🖥️ Switched to ${inputName}`);
  } catch (error) {
    if ((error as Error).message.includes("command not found")) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Checking dependencies...",
        message: "Looking for Homebrew.",
      });

      try {
        await execAsync(`${envPath} && which brew`);
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Homebrew is Missing";
        toast.message = "You need Homebrew to install m1ddc.";

        toast.primaryAction = {
          title: "Copy Brew Install Command",
          onAction: () => {
            Clipboard.copy(
              '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
            );
            toast.hide();
            showHUD("Copied Homebrew command to clipboard.");
          },
        };

        toast.secondaryAction = {
          title: "Open brew.sh",
          onAction: () => open("https://brew.sh"),
        };
        return;
      }

      toast.title = "Installing m1ddc...";
      toast.message = "Fetching from Homebrew. This might take a moment.";

      try {
        await execAsync(`${brewEnv} && brew install m1ddc`);

        toast.style = Toast.Style.Success;
        toast.title = "Installation Complete";
        toast.message = "Executing monitor switch...";

        await execAsync(switchCommand);
        await showHUD(`🖥️ Switched to ${inputName}`);
      } catch (installError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Installation Failed";
        toast.message = "Could not install m1ddc via Homebrew.";

        toast.primaryAction = {
          title: "Copy Error Log",
          onAction: () => {
            Clipboard.copy(String(installError));
            toast.hide();
            showHUD("Error log copied to clipboard");
          },
        };
      }
    } else {
      const errorToast = await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch input",
        message: "Monitor may be unresponsive or DDC failed.",
      });

      errorToast.primaryAction = {
        title: "Copy Error Log",
        onAction: () => {
          Clipboard.copy(String(error));
          errorToast.hide();
          showHUD("Error log copied to clipboard");
        },
      };
    }
  }
}
