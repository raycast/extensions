import { Action, ActionPanel, Detail, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { cpus, homedir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const brewPath = cpus()[0].model.includes("Apple") ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew";

async function handleInstall() {
  await showToast({ style: Toast.Style.Animated, title: "Installing Apfel…", message: "This may take a minute" });

  try {
    await execFileAsync(brewPath, ["install", "Arthur-Ficial/tap/apfel"], {
      env: {
        HOME: homedir(),
        PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
        HOMEBREW_NO_AUTO_UPDATE: "1",
      },
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Apfel installed!",
      message: "Reopen the command to get started",
    });

    await popToRoot();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await showToast({
      style: Toast.Style.Failure,
      title: "Installation failed",
      message,
    });
  }
}

export default function NotFoundView() {
  const markdown = `# Apfel Not Found

The \`apfel\` binary could not be found on your system. You can try installing it within Raycast or install it yourself:

\`\`\`bash
brew install Arthur-Ficial/tap/apfel
\`\`\`

## Requirements

- Apple Silicon Mac
- macOS 26 (Tahoe) or later
- Apple Intelligence enabled

After installing, reopen this command.
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="apfel Not Installed"
      actions={
        <ActionPanel>
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action title="Install via Homebrew" icon={Icon.Download} onAction={handleInstall} />
          <Action.OpenInBrowser title="Open Apfel Website" url="https://apfel.franzai.com" />
          <Action.CopyToClipboard title="Copy Install Command" content="brew install Arthur-Ficial/tap/apfel" />
        </ActionPanel>
      }
    />
  );
}
