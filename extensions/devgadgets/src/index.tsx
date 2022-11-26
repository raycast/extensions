import { ActionPanel, Detail, List, Action } from "@raycast/api";

import UNIXTimeConverter from "./unix-time-converter";
import JSONBeautify from "./json-beautify";
import Base64 from "./base64";

export default function Command() {
  return (
    <List>
      <List.Item
        icon="list-icon.png"
        title="UNIX Time Converter"
        actions={
          <ActionPanel>
            <Action.Push title="Use this!" target={<UNIXTimeConverter />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon="list-icon.png"
        title="JSON Beautify"
        actions={
          <ActionPanel>
            <Action.Push title="Use this!" target={<JSONBeautify />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon="list-icon.png"
        title="Base64"
        actions={
          <ActionPanel>
            <Action.Push title="Use this!" target={<Base64 />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
