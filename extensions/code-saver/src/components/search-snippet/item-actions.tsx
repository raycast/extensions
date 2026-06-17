import { Action, ActionPanel, Icon, Keyboard, List, closeMainWindow, popToRoot, useNavigation } from "@raycast/api";
import { Snippet } from "../../lib/types/dto";
import UpsertSnippetEntry from "../creation/snippet-entry";
import { deleteSnippet } from "../../lib/hooks/use-data-ops";
import InitError from "../init/init-error";

interface ItemActionsProps {
  snippet: Snippet;
  onUpdateSuccess?: () => void;
}

export function ItemActions({ snippet, onUpdateSuccess }: ItemActionsProps) {
  const { push } = useNavigation();
  return (
    <ActionPanel>
      {snippet.formatType == "freestyle" ? (
        <>
          <Action.CopyToClipboard title="Copy to Clipboard" content={snippet.content} />
          <Action.Paste content={snippet.content} />
        </>
      ) : (
        <Action.Push title="View the Detail" target={<CommandList page={parsePage(snippet)} />} />
      )}

      <Action.Push
        icon={Icon.Brush}
        title="Update This Snippet"
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={
          <UpsertSnippetEntry
            props={{
              ...snippet,
              snippetUUID: snippet.uuid,
              labelsUUID: snippet.labels.map((l) => l.uuid),
              libraryUUID: snippet.library.uuid,
              onUpdateSuccess,
            }}
          />
        }
      />
      <Action
        icon={Icon.DeleteDocument}
        title="Delete This Snippet"
        style={Action.Style.Destructive}
        onAction={async () => {
          const err = await deleteSnippet(snippet.uuid);
          if (err != undefined) {
            push(<InitError errMarkdown={err} />);
          }
          if (onUpdateSuccess) {
            onUpdateSuccess();
          }
        }}
        shortcut={{ modifiers: ["ctrl"], key: "delete" }}
      />
      <Action.CreateSnippet title="Save as Raycast Snippet" snippet={{ name: snippet.title, text: snippet.content }} />
    </ActionPanel>
  );
}

function CommandList(props: { page: Page }) {
  const page = props.page;
  return (
    <List navigationTitle={page.command}>
      {page.items?.map((item) => (
        <List.Section key={item.description} title={item.description}>
          <List.Item
            title={item.command}
            key={item.command}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={item.command}
                  onCopy={async () => {
                    await closeMainWindow();
                    await popToRoot();
                  }}
                />
                <OpenCommandWebsiteAction page={page} />
              </ActionPanel>
            }
          />
        </List.Section>
      ))}
    </List>
  );
}

function OpenCommandWebsiteAction(props: { page: Page }) {
  const page = props.page;
  return page.url ? <Action.OpenInBrowser title="Open Command Website" url={page.url} /> : null;
}

interface Page {
  command: string;
  filename: string;
  subtitle: string;
  markdown: string;
  url?: string;
  items: { description: string; command: string }[];
}

function parsePage(snippet: Snippet): Page {
  const markdown = snippet.content;
  const subtitle = [];
  const commands = [];
  const descriptions = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    if (line.startsWith(">")) subtitle.push(line.slice(2));
    else if (line.startsWith("`")) commands.push(line.slice(1, -1));
    else if (line.startsWith("-")) descriptions.push(line.slice(2));
  }

  const match = markdown.match(
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/
  );
  const url = match ? match[0] : undefined;

  return {
    command: lines[0].slice(2),
    filename: snippet.fileName,
    subtitle: subtitle[0],
    markdown: markdown,
    url,
    items: zip(commands, descriptions).map(([command, description]) => ({
      command: command as string,
      description: description as string,
    })),
  };
}

function zip(arr1: string[], arr2: string[]) {
  return arr1.map((value, index) => [value, arr2[index]]);
}
