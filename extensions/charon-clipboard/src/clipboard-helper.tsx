import { Action, ActionPanel, Detail, environment, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { disableHelper, enableHelper, isHelperEnabled, isHelperRunning } from "./lib/watcher";

const markdown = (enabled: boolean, running: boolean) => `# Clipboard Helper

${enabled ? (running ? "🟢 **Running** — you're all set." : "🟡 **Enabled but not running** — press Enter to restart it.") : "Press **Enter** to enable the helper."}

Then assign hotkeys in Raycast Settings → Extensions → Charon Clipboard:

| Command | Clipy's hotkey |
| --- | --- |
| Show Clipboard Menu | ⌘ ⇧ V |
| Show History Menu | ⌃ ⌘ V |
| Show Snippet Menu | ⌘ ⇧ B |

---

### What the helper does

Raycast extensions can't watch the clipboard or open a menu at the mouse cursor, so Charon uses a small helper that:

- records every copy (text, rich text, images and files) in this extension's folder — nothing leaves your Mac
- skips items that password managers mark as concealed
- shows the Clipy-style menu at your cursor

It's a plain JavaScript file run by macOS's built-in \`osascript\` (no binaries), started at login by \`~/Library/LaunchAgents/com.raycast.charon-clipboard.helper.plist\`. You can disable it here at any time.
`;

export default function Command() {
  const [enabled, setEnabled] = useState(isHelperEnabled());
  const [running, setRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setEnabled(isHelperEnabled());
    setRunning(await isHelperRunning());
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const enable = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Enabling clipboard helper…" });
    try {
      await enableHelper();
      await new Promise((r) => setTimeout(r, 800));
      await refresh();
      await toast.hide();
      await showHUD("Clipboard helper enabled — copy something and press your hotkey");
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not enable the helper";
      toast.message = String(e);
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown(enabled, running)}
      actions={
        <ActionPanel>
          {!enabled || !running ? (
            <Action title={enabled ? "Restart Helper" : "Enable Helper"} icon={Icon.Power} onAction={enable} />
          ) : null}
          {enabled ? (
            <Action
              title="Disable Helper"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={async () => {
                try {
                  await disableHelper();
                  await refresh();
                  await showToast({ style: Toast.Style.Success, title: "Clipboard helper disabled" });
                } catch (e) {
                  await showFailureToast(e, { title: "Could not disable the helper" });
                }
              }}
            />
          ) : null}
          <Action.ShowInFinder title="Show Data Folder" path={environment.supportPath} />
        </ActionPanel>
      }
    />
  );
}
