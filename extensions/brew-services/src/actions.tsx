import { Action, Icon, ActionPanel, Keyboard } from "@raycast/api";
import { homedir } from "os";
import { stopService, restartService, startService, runService, Service } from "./services";

export function StopService(props: { name: string }) {
  if (props.name == "--all") {
    return (
      <Action
        icon={Icon.Stop}
        title="Stop All Services"
        onAction={() => stopService(props.name)}
        shortcut={{ modifiers: ["cmd"], key: "x" }}
      />
    );
  }
  return <Action icon={Icon.Stop} title="Stop Service" onAction={() => stopService(props.name)} />;
}

export function RestartService(props: { name: string }) {
  if (props.name == "--all") {
    return (
      <Action
        icon={Icon.RotateAntiClockwise}
        title="Restart All Services"
        onAction={() => restartService(props.name)}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    );
  }
  return <Action icon={Icon.RotateAntiClockwise} title="Restart Service" onAction={() => restartService(props.name)} />;
}

export function StartService(props: { name: string }) {
  if (props.name == "--all") {
    return (
      <Action
        icon={Icon.Play}
        title="Start All Services"
        onAction={() => startService(props.name)}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
    );
  }
  return <Action icon={Icon.Play} title="Start Service" onAction={() => startService(props.name)} />;
}

export function RunService(props: { name: string }) {
  return <Action icon={Icon.ForwardFilled} title="Run Service" onAction={() => runService(props.name)} />;
}

export function PlistActions(props: { path: string }) {
  const path = props.path.replace(/^~/, homedir());
  return (
    <ActionPanel.Section title="Plist">
      <Action.ShowInFinder title="Show Plist File in Finder" path={path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
      <Action.OpenWith title="Open Plist File With" path={path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
      <Action.CopyToClipboard
        title="Copy Plist File Path"
        content={path}
        shortcut={Keyboard.Shortcut.Common.CopyPath}
      />
    </ActionPanel.Section>
  );
}

export function AllActions() {
  return (
    <ActionPanel.Section title="Manage All Services">
      <StartService name="--all" />
      <StopService name="--all" />
      <RestartService name="--all" />
    </ActionPanel.Section>
  );
}

export function BrewActions(props: { data: Service }) {
  if (props.data.status === "started" || props.data.status === "running") {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Manage Service">
          <StopService name={props.data.name} />
          <RestartService name={props.data.name} />
        </ActionPanel.Section>
        <PlistActions path={props.data.path} />
        <AllActions />
      </ActionPanel>
    );
  } else if (props.data.status === "stopped" || props.data.status === "none") {
    return (
      <ActionPanel title="Manage Service">
        <StartService name={props.data.name} />
        <RunService name={props.data.name} />
        <AllActions />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel title="Manage Service">
        <StopService name={props.data.name} />
        <RestartService name={props.data.name} />
        <AllActions />
      </ActionPanel>
    );
  }
}
