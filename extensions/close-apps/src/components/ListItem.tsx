import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { extractIcon } from "../util";
import type { Application } from "../types";

type Props = {
  name: string;
  isWhitelisted: boolean;
  refreshAction: () => void;
  toggleWhitelistAction: (app: Application) => void;
  closeAppsAction: () => void;
  navigationComponent: JSX.Element;
};

export default function AppList({
  isWhitelisted,
  name,
  refreshAction,
  toggleWhitelistAction,
  closeAppsAction,
  navigationComponent,
}: Props) {
  return (
    <List.Item
      title={name}
      icon={{ fileIcon: extractIcon(name) }}
      accessories={[
        {
          icon: isWhitelisted
            ? { source: Icon.Check, tintColor: Color.Green }
            : { source: Icon.Xmark, tintColor: Color.SecondaryText },
          tooltip: isWhitelisted ? "Whitelisted" : "Not whitelisted",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action
              title={isWhitelisted ? "Remove from Whitelist" : "Add to Whitelist"}
              icon={isWhitelisted ? Icon.Shield : Icon.Shield}
              onAction={() => toggleWhitelistAction({ isWhitelisted, name })}
            />

            <Action
              title="Close Non-whitelisted Apps"
              style={Action.Style.Destructive}
              icon={Icon.XMarkCircle}
              onAction={closeAppsAction}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refreshAction}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          {navigationComponent}
        </ActionPanel>
      }
    />
  );
}
