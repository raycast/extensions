import { ActionPanel, ActionPanelItem, Detail } from "@raycast/api";
import { exec, execSync } from "child_process";
import { promisify } from "util";

const execp = promisify(exec);

export default function NotInstalled() {
  return (
    <Detail
      actions={
        <ActionPanel>
          <ActionPanelItem
            title="Install with Homebrew"
            onAction={async () => {
              await execp("brew tap jakehilborn/jakehilborn");
              await execp("brew install displayplacer");
            }}
          />
        </ActionPanel>
      }
      markdown={`
  # 🚨 Error: Displayplacer Utility is not installed
  This extension depends on a command-line utilty that is not detected on your system. You must install it continue.

  If you have homebrew installed, simply press **⏎** to have this extension install it for you.

  To install homebrew, visit [this link](https://brew.sh)

  Or, to install displayplacer manually, [click here](https://github.com/jakehilborn/displayplacer).
  `}
    />
  );
}
