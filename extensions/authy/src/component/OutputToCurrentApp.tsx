import { ActionPanel, ActionPanelItemProps, closeMainWindow, environment, Icon, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { ReactElement } from "react";

type OutputToCurrentAppProps = { title: string, pin: string }

export function OutputToCurrentApp({ title, pin }: OutputToCurrentAppProps): ReactElement<ActionPanelItemProps> {
  return <ActionPanel.Item
    title={title} icon={Icon.ArrowRight}
    onAction={() => {
      closeMainWindow({ clearRootSearch: true }).then(() => {
        exec(`osascript "${environment.assetsPath}/cmdup.applescript"`, (err) => {
          if (err) {
            return showHUD(err.message);
          }
          const scripts = [
            `-e 'tell application "System Events" to keystroke "${pin}"'`,
            `-e 'tell application "System Events" to keystroke return'`
          ];
          exec(["osascript", ...scripts].join(" "));
        });
      });
    }}
  />;
}
