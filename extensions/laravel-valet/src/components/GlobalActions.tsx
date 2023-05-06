import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { restart, start, stop } from "../helpers/commands";
import { isRunning } from "../helpers/general";
import { useState } from "react";
import { LogsViewer } from "./LogsViewer";

export default function GlobalActions(): JSX.Element {
  const [running, setRunning] = useState(isRunning());

  return (
    <>
      <ActionPanel.Section title={`Valet actions (currently ${running ? "running" : "stopped"})`}>
        <Action
          title={running ? "Stop Valet" : "Start Valet"}
          icon={{
            source: running ? Icon.Stop : Icon.Play,
            tintColor: running ? Color.Red : Color.Green,
          }}
          onAction={async () => {
            running ? await stop() : await start();
            setRunning(isRunning());
          }}
        />
        <Action
          title="Restart Valet"
          icon={{ source: Icon.RotateAntiClockwise }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={async () => {
            await restart();
            setRunning(isRunning());
          }}
        />
        <Action.Push
          title="View Logs"
          icon={{ source: Icon.List }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          target={<LogsViewer />}
        />
      </ActionPanel.Section>
    </>
  );
}
