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
import { deleteObject, loadCardMarkdown, MyMindObject, ObjectNote, pinObject, unpinObject, updateObject } from "../api";
import AddNote from "../add-a-new-note";
import { safeHostname } from "../utils";
import { ManageTagsForm } from "./ManageTagsForm";
import { EditCardForm } from "./EditCardForm";
import { ManageLinksView } from "./ManageLinksView";
import { ManageNotesView } from "./ManageNotesView";
import { ManageSpacesView } from "./ManageSpacesView";
import { RelatedView } from "./RelatedView";

const MYMIND_WEB_URL = "https://access.mymind.com/everything";

function noteToMarkdown(note: ObjectNote): string {
  if (note.content == null) return "";
  if (typeof note.content === "string") return note.content;
  if (typeof note.content === "object") {
    const body = (note.content as { body?: unknown }).body;
    if (typeof body === "string") return body;
  }
  return "";
}

function CardDetail({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  const { isLoading, data: markdown = "", error, revalidate } = useCachedPromise(loadCardMarkdown, [object.id]);
  const heading = object.title ? `# ${object.title}\n\n` : "";
  const summarySection = object.summary?.trim() ? `> ${object.summary.trim()}\n\n` : "";
  const mainBody = error
    ? `> Couldn't load body: ${error.message}`
    : !isLoading && !markdown.trim()
      ? "_The mymind API doesn't expose the reader body for this card. Press ⌘↵ to open the original._"
      : markdown;
  const notes = (object.notes ?? []).map(noteToMarkdown).filter((n) => n.trim().length > 0);
  const notesSection =
    notes.length > 0 ? `\n\n---\n\n## Notes\n\n${notes.map((n) => `- ${n.replace(/\n/g, "\n  ")}`).join("\n\n")}` : "";

  const handleChange = () => {
    revalidate();
    onChange?.();
  };

  const dominantColor = object.blob?.palette?.dominantColor ?? null;
  const fileName = object.blob?.name?.trim() || null;

  // Prefer the API 0.7.0 `mainEntity`, falling back to the deprecated
  // `entityType` / `entities` shape while both are served.
  const entityType = object.mainEntity?.["@type"]?.trim() || object.entityType?.trim() || null;
  const mainEntityName = object.mainEntity?.name?.trim();
  const entityNames = mainEntityName
    ? [mainEntityName]
    : Array.from(new Set(object.entities.map((e) => e.name?.trim()).filter((n): n is string => !!n)));

  return (
    <Detail
      isLoading={isLoading}
      markdown={heading + summarySection + mainBody + notesSection}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Created" text={new Date(object.created).toLocaleString()} />
          <Detail.Metadata.Label title="Modified" text={new Date(object.modified).toLocaleString()} />
          {entityType && <Detail.Metadata.Label title="Type" text={entityType} />}
          {object.completed && <Detail.Metadata.Label title="Status" text="Completed" icon={Icon.CheckCircle} />}
          {fileName && <Detail.Metadata.Label title="File" text={fileName} />}
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
          {entityNames.length > 0 && (
            <Detail.Metadata.TagList title="Entities">
              {entityNames.map((name) => (
                <Detail.Metadata.TagList.Item key={name} text={name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {dominantColor && (
            <Detail.Metadata.TagList title="Color">
              <Detail.Metadata.TagList.Item text={dominantColor} color={dominantColor} />
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

  const handleToggleCompleted = async () => {
    const next = !object.completed;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: next ? "Marking complete…" : "Marking incomplete…",
    });
    try {
      await updateObject(object.id, { completed: next });
      toast.style = Toast.Style.Success;
      toast.title = next ? "Marked complete" : "Marked incomplete";
      onChange?.();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to update card" });
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
          title="Manage Tags"
          icon={Icon.Tag}
          target={<ManageTagsForm object={object} onChange={onChange} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
        <Action.Push
          title="Manage Notes"
          icon={Icon.Document}
          target={<ManageNotesView object={object} onChange={onChange} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
        <Action.Push
          title="Manage Links"
          icon={Icon.Link}
          target={<ManageLinksView object={object} onChange={onChange} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
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
        <Action
          title={object.completed ? "Mark as Incomplete" : "Mark as Complete"}
          icon={object.completed ? Icon.Circle : Icon.CheckCircle}
          onAction={handleToggleCompleted}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
