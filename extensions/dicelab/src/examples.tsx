// Dicelab Examples command

import { List, ActionPanel, Action, LaunchType } from "@raycast/api";
import { EXAMPLES } from "./utils/constants";
import EvaluateCommand from "./evaluate";

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
                  <EvaluateCommand
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
