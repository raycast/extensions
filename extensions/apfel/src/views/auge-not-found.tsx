import { Action, ActionPanel, Detail, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { homedir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const brewPath = process.arch === "arm64" ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew";
const ENV = {
  HOME: homedir(),
  PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
  HOMEBREW_NO_AUTO_UPDATE: "1",
};

async function handleInstall() {
  await showToast({ style: Toast.Style.Animated, title: "Installing auge…", message: "This may take a minute" });

  try {
    await execFileAsync(brewPath, ["tap", "Arthur-Ficial/tap"], { env: ENV });
    await execFileAsync(brewPath, ["install", "Arthur-Ficial/tap/auge"], { env: ENV });

    await showToast({
      style: Toast.Style.Success,
      title: "auge installed!",
      message: "Reopen the command to get started",
    });

    await popToRoot();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await showToast({ style: Toast.Style.Failure, title: "Installation failed", message });
  }
}

export default function AugeNotFoundView() {
  const markdown = `# auge Not Found

The \`auge\` binary could not be found on your system. You can install it within Raycast or run these commands yourself:

\`\`\`bash
brew tap Arthur-Ficial/tap
brew install Arthur-Ficial/tap/auge
\`\`\`

## Requirements

- macOS 10.15 or later
- No API keys or cloud services — runs entirely on-device

After installing, reopen this command.
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="auge Not Installed"
      actions={
        <ActionPanel>
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action title="Install via Homebrew" icon={Icon.Download} onAction={handleInstall} />
          <Action.CopyToClipboard
            title="Copy Install Commands"
            content="brew tap Arthur-Ficial/tap && brew install Arthur-Ficial/tap/auge"
          />
        </ActionPanel>
      }
    />
  );
}
