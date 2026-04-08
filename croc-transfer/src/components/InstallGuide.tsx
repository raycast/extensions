import { Action, ActionPanel, Clipboard, Detail, showHUD } from "@raycast/api";

const INSTALL_COMMAND = "brew install croc";

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

export function InstallGuide() {
  return (
    <Detail
      markdown={MARKDOWN}
      actions={
        <ActionPanel>
          <Action
            title="Copy Install Command"
            onAction={async () => {
              await Clipboard.copy(INSTALL_COMMAND);
              await showHUD("Copied: brew install croc");
            }}
          />
          <Action.OpenInBrowser title="View croc on GitHub" url="https://github.com/schollz/croc" />
        </ActionPanel>
      }
    />
  );
}
