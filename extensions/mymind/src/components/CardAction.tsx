import {
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Keyboard,
  Detail,
  Clipboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { deleteObject, loadCardMarkdown, MyMindObject, pinObject, unpinObject } from "../api";
import AddNote from "../add-a-new-note";
import { safeHostname } from "../utils";
import { AddTagsForm } from "./AddTagsForm";
import { EditCardForm } from "./EditCardForm";
import { ManageSpacesView } from "./ManageSpacesView";
import { RelatedView } from "./RelatedView";

const MYMIND_WEB_URL = "https://access.mymind.com/everything";

function CardDetail({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  const {
    isLoading,
    data: markdown = "",
    error,
    revalidate,
  } = useCachedPromise(loadCardMarkdown, [object.id]);
  const heading = object.title ? `# ${object.title}\n\n` : "";
  const body = error
    ? `> Couldn't load body: ${error.message}`
    : !isLoading && !markdown.trim()
      ? "_The mymind API doesn't expose the reader body for this card. Press ⌘↵ to open the original._"
      : markdown;

  const handleChange = () => {
    revalidate();
    onChange?.();
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={heading + body}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Created" text={new Date(object.created).toLocaleString()} />
          <Detail.Metadata.Label title="Modified" text={new Date(object.modified).toLocaleString()} />
          {object.entityType && <Detail.Metadata.Label title="Type" text={object.entityType} />}
          {object.source?.url && (
            <Detail.Metadata.Link
              title="Source"
              target={object.source.url}
              text={safeHostname(object.source.url) ?? object.source.url}
            />
          )}
          {object.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {Array.from(new Set(object.tags.map((t) => t.name))).map((name) => (
                <Detail.Metadata.TagList.Item key={name} text={name} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={<CardActions object={object} onChange={handleChange} hideDetailAction />}
    />
  );
}

export function CardActions({
  object,
  onChange,
  hideDetailAction = false,
}: {
  object: MyMindObject;
  onChange?: () => void;
  hideDetailAction?: boolean;
}) {
  const mymindUrl = `${MYMIND_WEB_URL}/#${object.id}`;

  const handleDelete = async () => {
    const proceed = await confirmAlert({
      title: "Delete card",
      message: "Move this card to the trash? You can restore it within 30 days.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!proceed) return;
    try {
      await deleteObject(object.id);
      await showToast({ style: Toast.Style.Success, title: "Card deleted" });
      onChange?.();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete card" });
    }
  };

  const handlePin = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Pinning…" });
    try {
      await pinObject(object.id);
      toast.style = Toast.Style.Success;
      toast.title = "Pinned";
      onChange?.();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to pin card" });
    }
  };

  const handleUnpin = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Unpinning…" });
    try {
      await unpinObject(object.id);
      toast.style = Toast.Style.Success;
      toast.title = "Unpinned";
      onChange?.();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to unpin card" });
    }
  };

  const handleCopyMarkdown = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching content…" });
    try {
      const markdown = await loadCardMarkdown(object.id);
      await Clipboard.copy(markdown);
      toast.style = Toast.Style.Success;
      toast.title = "Copied as markdown";
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to copy markdown" });
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!hideDetailAction && (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<CardDetail object={object} onChange={onChange} />}
          />
        )}
        <Action.Push
          title="Find Related"
          icon={Icon.Network}
          target={<RelatedView source={object} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
        <Action.Push
          title="Edit Card"
          icon={Icon.Pencil}
          target={<EditCardForm object={object} onSaved={onChange} />}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
        <Action.Push
          title="Manage Spaces"
          icon={Icon.Folder}
          target={<ManageSpacesView object={object} onChange={onChange} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        />
        <Action.Push
          title="Add Tags"
          icon={Icon.Tag}
          target={<AddTagsForm object={object} onChange={onChange} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
        {object.source?.url && <Action.OpenInBrowser url={object.source.url} />}
        <Action.OpenInBrowser
          title="Open in Mymind"
          url={mymindUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Copy as Markdown"
          icon={Icon.Clipboard}
          onAction={handleCopyMarkdown}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        />
        {object.source?.url && <Action.CopyToClipboard title="Copy Source URL" content={object.source.url} />}
        <Action.CopyToClipboard
          title="Copy Mymind URL"
          content={mymindUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Pin Card"
          icon={Icon.Pin}
          onAction={handlePin}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        />
        <Action
          title="Unpin Card"
          icon={Icon.PinDisabled}
          onAction={handleUnpin}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: "p" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Card"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDelete}
          shortcut={Keyboard.Shortcut.Common.Remove}
        />
        <Action.Push
          title="Add a New Note"
          target={<AddNote />}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
