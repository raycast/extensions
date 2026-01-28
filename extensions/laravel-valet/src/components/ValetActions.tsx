import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { restart, start, stop } from "../helpers/commands";
import { isRunning } from "../helpers/general";
import { useState } from "react";
import { LogsViewer } from "./LogsViewer";

export default function ValetActions(): JSX.Element {
  const [running, setRunning] = useState(isRunning());
  const refresh = () => setRunning(isRunning());

  return (
    <ActionPanel.Section title={"Valet actions"}>
      <StartOrStop running={running} callBack={refresh} />
      <Restart running={running} callBack={refresh} />
      <ViewLogs />
    </ActionPanel.Section>
  );
}

interface RunningCallProps {
  running: boolean;
  callBack?: () => void;
}

export const StartOrStop = ({ running, callBack }: RunningCallProps): JSX.Element => (
  <Action
    title={running ? "Stop Valet" : "Start Valet"}
    icon={{
      source: running ? Icon.Stop : Icon.Play,
      tintColor: running ? Color.Red : Color.Green,
    }}
    onAction={async () => {
      running ? await stop() : await start();
      callBack?.();
    }}
  />
);

export const Restart = ({ callBack }: RunningCallProps): JSX.Element => (
  <Action
    title="Restart Valet"
    icon={{ source: Icon.RotateAntiClockwise }}
    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    onAction={async () => {
      await restart();
      callBack?.();
    }}
  />
);

export const ViewLogs = (): JSX.Element => (
  <Action.Push
    title="View Logs"
    icon={{ source: Icon.List }}
    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
    target={<LogsViewer />}
  />
);
