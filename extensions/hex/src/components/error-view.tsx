import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import { startHex } from "../lib/feedback";
import { errorCode, errorMessage, HEX_RELEASES_URL } from "../lib/hex";

type Props = { error: Error; onRetry: () => void };

function describe(error: Error) {
  switch (errorCode(error)) {
    case "not-running":
      return { icon: Icon.Power, title: "Hex isn't running", description: "Open Hex to continue." };
    case "hex-missing":
      return { icon: Icon.Download, title: "Hex isn't installed", description: "Download Hex from GitHub." };
    case "cli-missing":
      return { icon: Icon.Download, title: "Hex needs an update" };
    case "disabled":
    case "feature-off":
      return { icon: Icon.Switch, title: "This is off in Hex" };
    case "transport":
    case "timeout":
      return { icon: Icon.Warning, title: "Couldn't reach Hex" };
    case undefined:
      return { icon: Icon.Warning, title: "Couldn't load Hex data" };
    default:
      return { icon: Icon.Warning, title: "Hex command failed" };
  }
}

function ErrorActions({ error, onRetry }: Props) {
  const code = errorCode(error);
  return (
    <ActionPanel>
      {code === "not-running" && (
        <Action
          title="Open Hex"
          icon={Icon.Power}
          onAction={async () => {
            await startHex();
            onRetry();
          }}
        />
      )}
      {(code === "hex-missing" || code === "cli-missing") && (
        <Action.OpenInBrowser title="Download Hex" url={HEX_RELEASES_URL} />
      )}
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
    </ActionPanel>
  );
}

export function ListErrorView(props: Props) {
  const { icon, title, description } = describe(props.error);
  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description ?? errorMessage(props.error)}
      actions={<ErrorActions {...props} />}
    />
  );
}

export function GridErrorView(props: Props) {
  const { icon, title, description } = describe(props.error);
  return (
    <Grid.EmptyView
      icon={icon}
      title={title}
      description={description ?? errorMessage(props.error)}
      actions={<ErrorActions {...props} />}
    />
  );
}
