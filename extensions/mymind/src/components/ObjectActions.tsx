import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createObjectNote, deleteObject, getObject, pinObjectToTopOfMind, unpinObjectFromTopOfMind } from "../api";
import { getMymindObjectUrl, getObjectMarkdown, getObjectTypeLabel, getObjectUrl } from "../helpers";
import { MyMindObject } from "../types";

function AddNoteToObjectForm(props: { object: MyMindObject; onCreated?: () => Promise<void> | void }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { note: string }) {
    if (!values.note.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Note can't be empty" });
      return;
    }

    setIsLoading(true);

    try {
      await createObjectNote(props.object.id, values.note);
      await showToast({ style: Toast.Style.Success, title: "Note added" });
      await props.onCreated?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't add note",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Add a note to ${props.object.title || "this item"}.`} />
      <Form.TextArea id="note" title="Note" placeholder="Write in Markdown…" />
    </Form>
  );
}

export function ObjectActions(props: {
  object: MyMindObject;
  isDetailView?: boolean;
  onDeleted?: () => Promise<void> | void;
  onRefetch?: () => Promise<void> | void;
}) {
  const objectUrl = getObjectUrl(props.object);

  async function refreshTopOfMindMenuBar() {
    try {
      await launchCommand({ name: "top-of-mind-menu-bar", type: LaunchType.Background });
    } catch {
      // Ignore if the menu bar command is unavailable on this platform.
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Saved Item",
      message: "This will move the item to Recently Deleted in mymind.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await deleteObject(props.object.id);
      await showToast({ style: Toast.Style.Success, title: "Item deleted" });
      await props.onDeleted?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't delete item",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handlePin() {
    try {
      await pinObjectToTopOfMind(props.object.id);
      await showToast({ style: Toast.Style.Success, title: "Pinned to Top of Mind" });
      await props.onRefetch?.();
      await refreshTopOfMindMenuBar();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't pin item",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleUnpin() {
    try {
      await unpinObjectFromTopOfMind(props.object.id);
      await showToast({ style: Toast.Style.Success, title: "Removed from Top of Mind" });
      await props.onRefetch?.();
      await refreshTopOfMindMenuBar();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't remove item",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!props.isDetailView && (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<ObjectDetail objectId={props.object.id} fallbackObject={props.object} />}
          />
        )}
        {objectUrl && <Action.OpenInBrowser url={objectUrl} />}
        <Action.OpenInBrowser title="Open in Mymind" url={getMymindObjectUrl(props.object.id)} />
        {objectUrl && <Action.CopyToClipboard title="Copy Source URL" content={objectUrl} />}
        <Action.CopyToClipboard title="Copy Item Identifier" content={props.object.id} />
        <ActionPanel.Submenu title="Top of Mind" icon={Icon.Pin}>
          <Action title="Pin to Top of Mind" onAction={handlePin} />
          <Action title="Remove from Top of Mind" onAction={handleUnpin} />
        </ActionPanel.Submenu>
        <Action
          title="Delete Item"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDelete}
          shortcut={Keyboard.Shortcut.Common.Remove}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Add Note"
          icon={Icon.Pencil}
          target={<AddNoteToObjectForm object={props.object} onCreated={props.onRefetch} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ObjectDetail(props: { objectId: string; fallbackObject?: MyMindObject }) {
  const [object, setObject] = useState<MyMindObject | undefined>(props.fallbackObject);
  const [isLoading, setIsLoading] = useState(!props.fallbackObject);

  async function loadObject() {
    setIsLoading(true);
    try {
      setObject(await getObject(props.objectId));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!props.fallbackObject) {
      void loadObject();
    }
  }, [props.objectId]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={object ? getObjectMarkdown(object) : "# Loading…"}
      metadata={
        object ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Type" text={getObjectTypeLabel(object)} />
            <Detail.Metadata.Label title="Created" text={new Date(object.created).toLocaleString()} />
            <Detail.Metadata.Label title="Modified" text={new Date(object.modified).toLocaleString()} />
            {object.summary && <Detail.Metadata.Label title="Summary" text={object.summary} />}
            {object.tags.length > 0 && (
              <Detail.Metadata.TagList title="Tags">
                {object.tags.map((tag) => (
                  <Detail.Metadata.TagList.Item key={tag.name} text={tag.name} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={object ? <ObjectActions object={object} isDetailView={true} onRefetch={loadObject} /> : <ActionPanel />}
    />
  );
}
