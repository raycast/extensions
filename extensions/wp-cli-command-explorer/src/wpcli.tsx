import { ActionPanel, List, Action, Icon, Detail } from "@raycast/api";
import { wpCommands, WPCommand } from "./data/commands";
import React from "react";

export default function Command() {
  return <CommandList commands={wpCommands} parentName={"wp"} parentCommand={null} isTopLevel />;
}

function CommandList({
  commands,
  parentName,
  parentCommand,
  isTopLevel,
}: {
  commands: WPCommand[];
  parentName: string;
  parentCommand: WPCommand | null;
  isTopLevel?: boolean;
}) {
  return (
    <List navigationTitle={parentName === "wp" ? "WP-CLI Commands" : `${parentName} Subcommands`}>
      {parentCommand && (
        <List.Section title="Main Command">
          <List.Item
            key={parentCommand.name + "-parent"}
            title={parentCommand.name}
            subtitle={parentCommand.description}
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={
                    <CommandDetail
                      command={parentCommand}
                      parentName={parentName.split(" ").slice(0, -1).join(" ") || "wp"}
                      alwaysShowCopyAction
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {isTopLevel ? (
        <>
          {commands.map((command) => (
            <List.Item
              key={command.name}
              title={command.name}
              subtitle={command.description}
              icon={command.subcommands ? Icon.ChevronRight : Icon.Terminal}
              actions={
                <ActionPanel>
                  {command.subcommands ? (
                    <Action.Push
                      title="Show Subcommands"
                      target={
                        <CommandList
                          commands={command.subcommands as WPCommand[]}
                          parentName={`wp ${command.name}`}
                          parentCommand={command}
                        />
                      }
                    />
                  ) : null}
                  <Action.Push
                    title="Show Details"
                    target={<CommandDetail command={command} parentName={parentName} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.Section title="Subcommands">
          {commands.map((command) => (
            <List.Item
              key={command.name}
              title={command.name}
              subtitle={command.description}
              icon={command.subcommands ? Icon.ChevronRight : Icon.Terminal}
              actions={
                <ActionPanel>
                  {command.subcommands ? (
                    <Action.Push
                      title="Show Subcommands"
                      target={
                        <CommandList
                          commands={command.subcommands as WPCommand[]}
                          parentName={`wp ${command.name}`}
                          parentCommand={command}
                        />
                      }
                    />
                  ) : null}
                  <Action.Push
                    title="Show Details"
                    target={<CommandDetail command={command} parentName={parentName} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function getWpCliDocUrl(command: WPCommand, parentName: string) {
  // parentName is like 'wp plugin', command.name is 'install' for subcommands
  const parts = parentName.split(" ").slice(1); // remove 'wp'
  const urlParts = [...parts, command.name].filter(Boolean);
  return `https://developer.wordpress.org/cli/commands/${urlParts.join("/")}/`;
}

function CommandDetail({
  command,
  parentName,
  alwaysShowCopyAction,
}: {
  command: WPCommand;
  parentName: string;
  alwaysShowCopyAction?: boolean;
}) {
  const fullCommand = `${parentName} ${command.name}`.replace(/^wp wp/, "wp");
  let markdown = `# ${fullCommand}\n\n${command.description}`;

  // Prepare all examples (main + subcommands)
  const examples: { label: string; code: string }[] = [];
  if (command.example) {
    examples.push({ label: `Example for ${fullCommand}`, code: command.example });
  }
  if (command.subcommands) {
    for (const sub of command.subcommands) {
      if (sub.example) {
        examples.push({ label: `Example for ${fullCommand} ${sub.name}`, code: sub.example });
      }
    }
  }

  const docUrl = getWpCliDocUrl(command, parentName);

  // Show copy action if alwaysShowCopyAction is true, or if there are no subcommands
  const actions =
    alwaysShowCopyAction || !command.subcommands || command.subcommands.length === 0 ? (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy Command" content={fullCommand} />
        {examples.map((ex, i) => (
          <Action.CopyToClipboard key={i} title={`Copy Example: ${ex.label}`} content={ex.code} />
        ))}
        <Action.OpenInBrowser url={docUrl} title="Open Wp-Cli Documentation" />
      </ActionPanel>
    ) : (
      <ActionPanel>
        {examples.map((ex, i) => (
          <Action.CopyToClipboard key={i} title={`Copy Example: ${ex.label}`} content={ex.code} />
        ))}
        <Action.OpenInBrowser url={docUrl} title="Open Wp-Cli Documentation" />
      </ActionPanel>
    );

  // Render examples in markdown with copy icon
  if (examples.length > 0) {
    markdown += `\n\n## Examples\n`;
    examples.forEach((ex) => {
      markdown += `\n**${ex.label}:**\n\n\`\`\`bash\n${ex.code}\n\`\`\``;
    });
  }

  return <Detail markdown={markdown} actions={actions} />;
}
