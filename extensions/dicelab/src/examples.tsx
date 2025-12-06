// Dicelab Examples command

import { List, ActionPanel, Action, LaunchType } from "@raycast/api";
import React from "react";
import { EXAMPLES } from "./utils/constants";
import RollCommand from "./roll";

export default function ExamplesCommand() {
  return (
    <List searchBarPlaceholder="Search examples...">
      {EXAMPLES.map((example, index) => (
        <List.Item
          key={index}
          title={example.title}
          subtitle={example.code}
          actions={
            <ActionPanel>
              <Action.Push
                title="Try Example"
                target={
                  <RollCommand
                    launchType={LaunchType.UserInitiated}
                    arguments={{ expression: example.code }}
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Expression"
                content={example.code}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
