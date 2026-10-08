import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { Restart, StartOrStop, ViewLogs } from "./ValetActions";
import { isRunning } from "../helpers/general";
import { useState } from "react";

export const ValetListItems = () => {
  const [running, setRunning] = useState(isRunning());
  const refresh = () => setRunning(isRunning());

  return (
    <>
      <List.Item
        title={running ? "Stop Valet" : "Start Valet"}
        accessories={[
          { text: running ? "Press to stop" : "Press to start" },
          {
            icon: {
              source: running ? Icon.Stop : Icon.Play,
              tintColor: running ? Color.Red : Color.Green,
            },
          },
        ]}
        detail={<List.Item.Detail markdown={running ? "Press to stop Valet" : "Press to start Valet"} />}
        actions={
          <ActionPanel>
            <StartOrStop running={running} callBack={refresh} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Restart Valet"}
        accessories={[{ text: "Press to restart" }, { icon: Icon.RotateAntiClockwise }]}
        detail={<List.Item.Detail markdown={"Press to restart Valet"} />}
        actions={
          <ActionPanel>
            <Restart running={running} callBack={refresh} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"View Logs"}
        accessories={[{ text: "Press to view logs" }, { icon: Icon.List }]}
        detail={<List.Item.Detail markdown={"Press to view logs"} />}
        actions={
          <ActionPanel>
            <ViewLogs />
          </ActionPanel>
        }
      />
    </>
  );
};
