import {
  Action,
  ActionPanel,
  Icon,
  List,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import { ErrorScenario, describeScenario } from "./errors";

interface Props {
  scenario: ErrorScenario;
}

export function ScenarioEmptyView({ scenario }: Props) {
  const { title, description } = describeScenario(scenario);

  switch (scenario.kind) {
    case "not-installed":
      return (
        <List.EmptyView
          icon={Icon.Download}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open TablePro Website"
                icon={Icon.Globe}
                url="https://tablepro.app"
              />
            </ActionPanel>
          }
        />
      );
    case "mcp-not-running":
      return (
        <List.EmptyView
          icon={Icon.Plug}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open TablePro"
                icon={Icon.AppWindow}
                target="tablepro://integrations/start-mcp"
              />
            </ActionPanel>
          }
        />
      );
    case "no-token":
      return (
        <List.EmptyView
          icon={Icon.Key}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action
                title="Pair with TablePro"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={async () => {
                  await launchCommand({
                    name: "pair",
                    type: LaunchType.UserInitiated,
                  });
                }}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      );
    case "token-revoked":
      return (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action
                title="Pair with TablePro"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={async () => {
                  await launchCommand({
                    name: "pair",
                    type: LaunchType.UserInitiated,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      );
    case "remote-unsupported":
      return (
        <List.EmptyView
          icon={Icon.Globe}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open TablePro Settings"
                icon={Icon.Gear}
                target="tablepro://settings"
              />
            </ActionPanel>
          }
        />
      );
    case "access-denied":
      return (
        <List.EmptyView
          icon={Icon.Lock}
          title={title}
          description={description}
        />
      );
    case "other":
      return (
        <List.EmptyView
          icon={Icon.Warning}
          title={title}
          description={description}
        />
      );
  }
}
