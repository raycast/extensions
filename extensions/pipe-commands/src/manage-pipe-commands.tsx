import { useState, useEffect } from "react";
import { InvalidCommand, parseScriptCommands, codeblock } from "./utils";
import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { basename } from "path";
import { ScriptCommand } from "./types";
import { PipeCommand } from "./pipe-to-command";

export default function managePipeCommands() {
  const [state, setState] = useState<{ invalid: InvalidCommand[]; commands: ScriptCommand[] }>();

  const loadCommands = () => {
    parseScriptCommands().then(setState);
  };

  useEffect(loadCommands, []);

  return (
    <List isLoading={typeof state == "undefined"} isShowingDetail>
      <List.Section title="Invalid Commands">
        {state?.invalid.map(({ path, content, errors }) => (
          <List.Item
            key={path}
            icon={Icon.ExclamationMark}
            title={basename(path)}
            detail={
              <List.Item.Detail
                markdown={["## Errors", ...errors.map((error) => `- ${error}`), "## Content", codeblock(content)].join(
                  "\n"
                )}
              />
            }
            actions={
              <ActionPanel>
                <Action.Open title="Open Script" target={path} />
                <Action.OpenWith path={path} />
                <Action.ShowInFinder path={path} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="User Commands">
        {state?.commands
          ?.filter((cmd) => cmd.user)
          .map((cmd) => (
            <PipeCommand key={cmd.path} command={cmd} onTrash={loadCommands} showContent />
          ))}
      </List.Section>
      <List.Section title="Built-in Commands">
        {state?.commands
          ?.filter((cmd) => !cmd.user)
          .map((cmd) => (
            <PipeCommand key={cmd.path} command={cmd} onTrash={loadCommands} showContent />
          ))}
      </List.Section>
    </List>
  );
}
