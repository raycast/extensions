import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { openInTerminal } from "../utils/external";

const BREW_INSTALL_CMD =
  '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';

const MARKDOWN = `# Homebrew isn't installed

Mac Updater uses Homebrew to detect, manage, and update most of the apps and packages on your Mac. Without it, only the Mac App Store and Sparkle sources will work.

## Two ways to install

**Option 1 — Install in Terminal.** This is the official path. Click below to open Terminal with the install command pre-typed; press Return to run it. You'll be prompted for your admin password by the installer.

\`\`\`
${BREW_INSTALL_CMD}
\`\`\`

**Option 2 — Visit brew.sh.** If you'd rather read what it does first, the website explains the whole thing.

---

Mac Updater works without Homebrew, but you'll miss out on most adoption and update features. We recommend installing it.
`;

export default function HomebrewMissing({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const { pop } = useNavigation();
  const [opening, setOpening] = useState(false);

  async function runInTerminal() {
    setOpening(true);
    try {
      await openInTerminal(BREW_INSTALL_CMD);
      await showToast({
        style: Toast.Style.Success,
        title: "Terminal opened",
        message: "Press Return in Terminal to start the install.",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't open Terminal",
        message: String(e),
      });
    } finally {
      setOpening(false);
    }
  }

  return (
    <Detail
      isLoading={opening}
      markdown={MARKDOWN}
      navigationTitle="Install Homebrew"
      actions={
        <ActionPanel>
          <Action
            title="Open Terminal With Install Command"
            icon={Icon.Terminal}
            onAction={runInTerminal}
          />
          <Action.OpenInBrowser
            title="Visit brew.sh"
            url="https://brew.sh"
            icon={Icon.Globe}
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={BREW_INSTALL_CMD}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <ActionPanel.Section>
            <Action
              title="Continue Without Homebrew"
              icon={Icon.Forward}
              onAction={() => {
                onContinue();
                pop();
              }}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
