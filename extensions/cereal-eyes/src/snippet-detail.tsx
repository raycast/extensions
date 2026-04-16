import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { updateSnippet } from "./utils/api";
import { getLangLabel } from "./utils/languages";
import CreateShare from "./create-share";
import EditSnippet from "./edit-snippet";
import ManageShares from "./manage-shares";
import type { Snippet } from "./types";

interface Props {
  snippet: Snippet;
  onRevalidate: () => void;
}

export default function SnippetDetail({ snippet, onRevalidate }: Props) {
  const { push } = useNavigation();
  const title = snippet.title ?? "Untitled";
  const langLabel = getLangLabel(snippet.language);

  const markdown = [
    `# ${title}`,
    "",
    snippet.language ? `\`\`\`${snippet.language}` : "```",
    snippet.content,
    "```",
  ].join("\n");

  async function handleToggleVisibility() {
    const next = !snippet.is_public;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: next ? "Making public…" : "Making private…",
    });
    try {
      await updateSnippet(snippet.id, { is_public: next });
      toast.style = Toast.Style.Success;
      toast.title = next ? "Snippet is now public" : "Snippet is now private";
      onRevalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update visibility";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={snippet.id} />
          <Detail.Metadata.Label title="Language" text={langLabel} />

          <Detail.Metadata.TagList title="Visibility">
            <Detail.Metadata.TagList.Item
              text={snippet.is_public ? "Public" : "Private"}
              color={snippet.is_public ? Color.Green : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>

          {snippet.has_active_burner_share && (
            <Detail.Metadata.TagList title="Active Shares">
              <Detail.Metadata.TagList.Item
                text="Burner active"
                color={Color.Orange}
              />
            </Detail.Metadata.TagList>
          )}

          {snippet.expires_at && (
            <Detail.Metadata.Label
              title="Expires"
              text={new Date(snippet.expires_at).toLocaleString()}
              icon={{
                source: Icon.Clock,
                tintColor:
                  new Date(snippet.expires_at) < new Date()
                    ? Color.Red
                    : Color.Yellow,
              }}
            />
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Created"
            text={new Date(snippet.created_at).toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={new Date(snippet.updated_at).toLocaleString()}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Copy Content"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(snippet.content);
                await showHUD("Content copied to clipboard");
              }}
            />
            <Action
              title="Edit Snippet"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() =>
                push(
                  <EditSnippet snippet={snippet} onRevalidate={onRevalidate} />,
                )
              }
            />
            <Action
              title={snippet.is_public ? "Make Private" : "Make Public"}
              icon={snippet.is_public ? Icon.Lock : Icon.LockUnlocked}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={handleToggleVisibility}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Share">
            <Action
              title="Create Link Share"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() =>
                push(
                  <CreateShare
                    snippet={snippet}
                    type="link"
                    onSuccess={onRevalidate}
                  />,
                )
              }
            />
            <Action
              title="Share with Contacts"
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={() =>
                push(
                  <CreateShare
                    snippet={snippet}
                    type="restricted"
                    onSuccess={onRevalidate}
                  />,
                )
              }
            />
            <Action
              title="Create Burner Link"
              icon={Icon.Bolt}
              shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
              onAction={() =>
                push(
                  <CreateShare
                    snippet={snippet}
                    type="burner"
                    onSuccess={onRevalidate}
                  />,
                )
              }
            />
            <Action
              title="Manage Shares"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => push(<ManageShares snippet={snippet} />)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Copy Id"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                await Clipboard.copy(snippet.id);
                await showHUD("Snippet ID copied");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
