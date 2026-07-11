import { Detail, ActionPanel, Action, Icon } from "@raycast/api";

const INSTALLATION_INSTRUCTIONS = `
# Welcome to MacPorts Search! 🚀

MacPorts is not installed on your system. Let's get you set up.

## Installation Steps

### 1. Install Command Line Tools
First, install Apple's Command Line Developer Tools:

\`\`\`bash
xcode-select --install
\`\`\`

### 2. Install MacPorts

Visit the [MacPorts Website](https://www.macports.org/install.php) to download the official installer for your macOS version.

### 3. Post Installation
After installing, run this command to update MacPorts:

\`\`\`bash
sudo port -v selfupdate
\`\`\`

## Next Steps
- Return to this extension to start managing your ports!
`;

export function Onboarding() {
  return (
    <Detail
      markdown={INSTALLATION_INSTRUCTIONS}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Download Macports"
            url="https://www.macports.org/install.php"
            icon={Icon.Download}
          />
        </ActionPanel>
      }
    />
  );
}
