import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";

interface InstallGuideProps {
  onCrocFound?: () => void;
}

const MARKDOWN = `
# croc is not installed

**croc** is required to use this extension.

## Install with Homebrew

\`\`\`bash
brew install croc
\`\`\`

## Install with Go

\`\`\`bash
go install github.com/schollz/croc/v10@latest
\`\`\`

## Verify installation

After installing, run:

\`\`\`bash
croc --version
\`\`\`

---

If you installed croc to a non-standard path, set the **croc Binary Path** in the extension preferences.
`;

export function InstallGuide({ onCrocFound }: InstallGuideProps) {
  async function handleInstallWithHomebrew() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing croc…",
      message: "brew install croc",
    });
    execFile(
      "/opt/homebrew/bin/brew",
      ["install", "croc"],
      (err, _stdout, stderr) => {
        if (err) {
          execFile(
            "/usr/local/bin/brew",
            ["install", "croc"],
            (err2, _stdout2, stderr2) => {
              if (err2) {
                toast.style = Toast.Style.Failure;
                toast.title = "Install failed";
                toast.message = (stderr2 || stderr).trim().slice(0, 200);
              } else {
                toast.style = Toast.Style.Success;
                toast.title = "croc installed!";
                onCrocFound?.();
              }
            },
          );
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "croc installed!";
          onCrocFound?.();
        }
      },
    );
  }

  return (
    <Detail
      markdown={MARKDOWN}
      actions={
        <ActionPanel>
          <Action
            title="Install with Homebrew"
            onAction={handleInstallWithHomebrew}
          />
          <Action title="Refresh" onAction={() => onCrocFound?.()} />
          <Action.OpenInBrowser
            title="View Croc on GitHub"
            url="https://github.com/schollz/croc"
          />
        </ActionPanel>
      }
    />
  );
}
