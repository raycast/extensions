import { useState, useEffect } from "react";
import { parseScriptCommands } from "./utils";
import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { basename } from "path";
import { ScriptCommand } from "./types";
import { PipeCommand } from "./pipe-to-command";

export default function managePipeCommands() {
  const [state, setState] = useState<{ invalid: string[]; commands: ScriptCommand[] }>();

  const loadCommands = () => {
    parseScriptCommands().then(setState);
  };

  useEffect(loadCommands, []);
  const textCommands = state?.commands.filter((command) => command.metadatas.input.type === "text");
  const fileCommands = state?.commands.filter((command) => command.metadatas.input.type === "file");

  return (
    <List isLoading={typeof state == "undefined"}>
      <List.Section title="Invalid Commands">
        {state?.invalid.map((path) => (
          <List.Item
            key={path}
            icon={Icon.ExclamationMark}
            title="Invalid Pipe Command"
            subtitle={basename(path)}
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
      <List.Section title="File Commands">
        {fileCommands?.map((cmd) => (
          <PipeCommand key={cmd.path} command={cmd} reload={loadCommands} />
        ))}
      </List.Section>
      <List.Section title="Text Commands">
        {textCommands?.map((cmd) => (
          <PipeCommand key={cmd.path} command={cmd} reload={loadCommands} />
        ))}
      </List.Section>
    </List>
  );
}
