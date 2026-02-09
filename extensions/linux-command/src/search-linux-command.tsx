import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { fetchCommands, fetchCommandDetail, LinuxCommandExtended, CommandDetail } from "./api";

export default function Command() {
  const [commands, setCommands] = useState<LinuxCommandExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    loadCommands();
  }, []);

  async function loadCommands() {
    try {
      setIsLoading(true);
      const data = await fetchCommands();
      setCommands(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load commands",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCommands = searchText
    ? commands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(searchText.toLowerCase()) ||
          cmd.description.toLowerCase().includes(searchText.toLowerCase()),
      )
    : commands;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Linux commands..."
      throttle
    >
      {filteredCommands.map((command) => (
        <List.Item
          key={command.name}
          icon={Icon.Terminal}
          title={command.name}
          subtitle={command.description}
          actions={
            <ActionPanel>
              <Action
                title="View Details"
                icon={Icon.Eye}
                onAction={() => push(<CommandDetailView command={command} />)}
              />
              <Action.CopyToClipboard title="Copy Command Name" content={command.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CommandDetailView({ command }: { command: LinuxCommandExtended }) {
  const [detail, setDetail] = useState<CommandDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    loadDetail();
  }, [command.name]);

  async function loadDetail() {
    try {
      setIsLoading(true);
      const data = await fetchCommandDetail(command.name);
      setDetail(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load command details",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  const animation = ``;

  const markdown = detail ? `# ${detail.name}\n\n${detail.content}` : `${animation}`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={command.name}
      actions={
        <ActionPanel>
          <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.CopyToClipboard title="Copy Command Name" content={command.name} />
          {detail?.examples && detail.examples.length > 0 && (
            <Action.CopyToClipboard title="Copy First Example" content={detail.examples[0]} />
          )}
        </ActionPanel>
      }
      metadata={
        detail && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Command" text={detail.name} />
            <Detail.Metadata.Label title="Description" text={detail.description} />
            {detail.syntax && <Detail.Metadata.Label title="Syntax" text={detail.syntax} />}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Source" text="linux-command (jaywcjlove)" />
          </Detail.Metadata>
        )
      }
    />
  );
}
