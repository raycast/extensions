import { ActionPanel, Detail, List, Action } from "@raycast/api";
import fs from "node:fs";

export default function Command() {
  const hosts = fs.readFileSync("/etc/hosts", "utf8");
  console.log(hosts);
  return (
    <List>
      <List.Item
        icon="list-icon.png"
        title="Greeting"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
