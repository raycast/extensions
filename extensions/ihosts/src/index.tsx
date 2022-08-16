import { ActionPanel, Detail, List, Action, Icon, Color } from "@raycast/api";
import fs from "node:fs";

export default function Command() {
  return (
    <List>
      <List.Item
        title={"System Hosts"}
        icon={{ source: Icon.ComputerChip, tintColor: Color.Blue }}
        actions={systemHostsActions(false)}
      />
      <List.Item title={"Uat"} icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} />
      <List.Item title={"Pre"} icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }} />
      <List.Item title={"Prod"} icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} />
    </List>
  );
}

function systemHostsDetail() {
  const systemHostsMd = fs.readFileSync("/etc/hosts", "utf8");
  return <Detail markdown={systemHostsMd} actions={systemHostsActions(true)} />;
}

function systemHostsActions(isDetail: boolean) {
  return (
    <ActionPanel>
      {!isDetail && <Action.Push title="Show Detail" target={systemHostsDetail()} />}
      <Action.OpenWith path={"/etc/hosts"} />
    </ActionPanel>
  );
}
