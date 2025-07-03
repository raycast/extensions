import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import wpCommands from "./wpcli-commands.json";

interface WPCommand {
  command: string;
  description: string;
  url: string;
  subcommands?: WPSubcommand[];
}

interface WPSubcommand {
  name: string;
  description: string;
}

function SubcommandsList({ command }: { command: WPCommand }) {
  return (
    <List searchBarPlaceholder={`Search ${command.command} subcommands...`}>
      {/* Parent Command */}
      <List.Item
        icon={Icon.Terminal}
        title={command.command}
        subtitle={command.description}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Details"
              target={
                <Detail
                  markdown={`# ${command.command}

## Description
${command.description}

## Documentation
[View full documentation](${command.url})

## Available Subcommands
This command has ${command.subcommands?.length || 0} subcommands:

${command.subcommands?.map((sub) => `- **${sub.name}**: ${sub.description}`).join("\n") || ""}

## Usage Examples
Run this command in your terminal:
\`\`\`bash
# Basic usage
${command.command}

# Get help for this command
${command.command} --help

# Example with common options
${command.command} [arguments] [--option=value]
\`\`\`

## Common Usage Patterns
\`\`\`bash
# List available subcommands
${command.command} --help

# Get version info (if supported)
${command.command} --version
\`\`\`

For more information about available options and subcommands, visit the [official documentation](${command.url}).`}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Copy Commands">
                        <Action.CopyToClipboard title="Copy Command" content={command.command} icon={Icon.Terminal} />
                        <Action.CopyToClipboard
                          title="Copy with Help Flag"
                          content={`${command.command} --help`}
                          icon={Icon.QuestionMark}
                        />
                        <Action.CopyToClipboard
                          title="Copy Example Code"
                          content={`# ${command.description}
${command.command}`}
                          icon={Icon.Code}
                        />
                        <Action.CopyToClipboard
                          title="Copy Usage Examples"
                          content={`# ${command.description}
# Basic usage
${command.command}

# Get help
${command.command} --help`}
                          icon={Icon.CodeBlock}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Documentation">
                        <Action.OpenInBrowser title="Open Documentation" url={command.url} icon={Icon.Globe} />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              }
            />
            <Action.CopyToClipboard title="Copy Command" content={command.command} />
            <Action.OpenInBrowser title="Open Documentation" url={command.url} />
          </ActionPanel>
        }
      />

      {/* Separator */}
      <List.Section title="Subcommands">
        {command.subcommands?.map((subcommand: WPSubcommand, index: number) => (
          <List.Item
            key={index}
            icon={Icon.Terminal}
            title={`${command.command} ${subcommand.name}`}
            subtitle={subcommand.description}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={
                    <Detail
                      markdown={`# ${command.command} ${subcommand.name}

## Description
${subcommand.description}

## Parent Command
${command.command}: ${command.description}

## Documentation
[View full documentation](${command.url})

## Usage Examples
Run this subcommand in your terminal:
\`\`\`bash
# Basic usage
${command.command} ${subcommand.name}

# Get help for this subcommand
${command.command} ${subcommand.name} --help

# Example with common options
${command.command} ${subcommand.name} [arguments] [--option=value]
\`\`\`

For more information about available options and parameters, visit the [official documentation](${command.url}).`}
                      actions={
                        <ActionPanel>
                          <ActionPanel.Section title="Copy Commands">
                            <Action.CopyToClipboard
                              title="Copy Command"
                              content={`${command.command} ${subcommand.name}`}
                              icon={Icon.Terminal}
                            />
                            <Action.CopyToClipboard
                              title="Copy with Help Flag"
                              content={`${command.command} ${subcommand.name} --help`}
                              icon={Icon.QuestionMark}
                            />
                            <Action.CopyToClipboard
                              title="Copy Example Code"
                              content={`# ${subcommand.description}
${command.command} ${subcommand.name}`}
                              icon={Icon.Code}
                            />
                            <Action.CopyToClipboard
                              title="Copy Usage Examples"
                              content={`# ${subcommand.description}
# Basic usage
${command.command} ${subcommand.name}

# Get help
${command.command} ${subcommand.name} --help`}
                              icon={Icon.CodeBlock}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section title="Documentation">
                            <Action.OpenInBrowser title="Open Documentation" url={command.url} icon={Icon.Globe} />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  }
                />
                <Action.CopyToClipboard title="Copy Command" content={`${command.command} ${subcommand.name}`} />
                <Action.OpenInBrowser title="Open Documentation" url={command.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Search WP-CLI commands...">
      {wpCommands.map((cmd: WPCommand, index: number) => (
        <List.Item
          key={index}
          icon={cmd.subcommands ? Icon.ChevronRight : Icon.Terminal}
          title={cmd.command}
          subtitle={cmd.description}
          accessories={cmd.subcommands ? [{ text: `${cmd.subcommands.length} subcommands` }] : undefined}
          actions={
            <ActionPanel>
              {cmd.subcommands ? (
                <Action.Push title="Show Subcommands" target={<SubcommandsList command={cmd} />} />
              ) : (
                <Action.Push
                  title="Show Details"
                  target={
                    <Detail
                      markdown={`# ${cmd.command}

## Description
${cmd.description}

## Documentation
[View full documentation](${cmd.url})

## Usage Examples
Run this command in your terminal:
\`\`\`bash
# Basic usage
${cmd.command}

# Get help for this command
${cmd.command} --help

# Example with common options
${cmd.command} [arguments] [--option=value]
\`\`\`

## Common Usage Patterns
\`\`\`bash
# List available options
${cmd.command} --help

# Get version info (if supported)
${cmd.command} --version
\`\`\`

For more information about available options and subcommands, visit the [official documentation](${cmd.url}).`}
                      actions={
                        <ActionPanel>
                          <ActionPanel.Section title="Copy Commands">
                            <Action.CopyToClipboard title="Copy Command" content={cmd.command} icon={Icon.Terminal} />
                            <Action.CopyToClipboard
                              title="Copy with Help Flag"
                              content={`${cmd.command} --help`}
                              icon={Icon.QuestionMark}
                            />
                            <Action.CopyToClipboard
                              title="Copy Example Code"
                              content={`# ${cmd.description}
${cmd.command}`}
                              icon={Icon.Code}
                            />
                            <Action.CopyToClipboard
                              title="Copy Usage Examples"
                              content={`# ${cmd.description}
# Basic usage
${cmd.command}

# Get help
${cmd.command} --help`}
                              icon={Icon.CodeBlock}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section title="Documentation">
                            <Action.OpenInBrowser title="Open Documentation" url={cmd.url} icon={Icon.Globe} />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  }
                />
              )}
              <Action.OpenInBrowser title="Open Documentation" url={cmd.url} />
              <Action.CopyToClipboard title="Copy Command" content={cmd.command} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
