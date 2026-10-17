import {
  Action,
  ActionPanel,
  Icon,
  List,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ErrorScenario, describeScenario } from "./errors";
import { launchTablePro } from "./app";
import { startMCPDeeplink } from "./deeplink";

interface Props {
  scenario: ErrorScenario;
}

function PairAction() {
  return (
    <Action
      title="Pair with TablePro"
      icon={Icon.Key}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={async () => {
        try {
          await launchCommand({
            name: "pair",
            type: LaunchType.UserInitiated,
          });
        } catch (err) {
          await showFailureToast(err, { title: "Could not start pairing" });
        }
      }}
    />
  );
}

function OpenTableProAction({
  startServer = false,
}: {
  startServer?: boolean;
}) {
  return (
    <Action
      title="Open TablePro"
      icon={Icon.AppWindow}
      onAction={async () => {
        try {
          if (startServer) await startMCPDeeplink();
          else await launchTablePro();
        } catch (err) {
          await showFailureToast(err, { title: "Could not open TablePro" });
        }
      }}
    />
  );
}

function PreferencesAction() {
  return (
    <Action
      title="Open Extension Preferences"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );
}

function DownloadAction({ title }: { title: string }) {
  return (
    <Action.OpenInBrowser
      title={title}
      icon={Icon.Globe}
      url="https://tablepro.app"
    />
  );
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
              <DownloadAction title="Open TablePro Website" />
            </ActionPanel>
          }
        />
      );
    case "update-required":
      return (
        <List.EmptyView
          icon={Icon.Download}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <OpenTableProAction />
              <DownloadAction title="Download TablePro" />
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
              <OpenTableProAction startServer />
            </ActionPanel>
          }
        />
      );
    case "unreachable":
      return (
        <List.EmptyView
          icon={Icon.Plug}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <PreferencesAction />
              <OpenTableProAction />
            </ActionPanel>
          }
        />
      );
    case "invalid-port":
      return (
        <List.EmptyView
          icon={Icon.Gear}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <PreferencesAction />
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
              <PairAction />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      );
    case "token-revoked":
    case "token-expired":
      return (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <PairAction />
            </ActionPanel>
          }
        />
      );
    case "server-disabled":
      return (
        <List.EmptyView
          icon={Icon.Plug}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <OpenTableProAction />
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
    case "rate-limited":
      return (
        <List.EmptyView
          icon={Icon.Clock}
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
