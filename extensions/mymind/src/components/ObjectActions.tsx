import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  addObjectToSpaces,
  addTagsToObject,
  createObjectNote,
  deleteObjectNote,
  deleteObject,
  getObject,
  hasMastermindSearchAccess,
  isReadOnlyWriteError,
  listLinks,
  listSpaces,
  listTags,
  pinObjectToTopOfMind,
  READ_ONLY_ACCESS_MESSAGE,
  removeObjectFromSpace,
  removeTagsFromObject,
  updateObject,
  updateObjectContent,
  updateObjectNote,
} from "../api";
import { getAccessKeyScope, useWriteAccess } from "../access-control";
import {
  getMymindObjectUrl,
  getObjectIcon,
  getObjectTypeLabel,
  getObjectUrl,
  getSpaceIcon,
  splitCommaSeparated,
} from "../helpers";
import { loadObjectDetailAssets } from "../object-assets";
import {
  DetailAssets,
  getMainEntityDisplayName,
  getMainEntityTypeNames,
  getObjectDetailMarkdown,
} from "../object-detail";
import { isUserTag } from "../tag-utils";
import { RelatedObjectList } from "./RelatedObjectList";
import { SimilarObjectList } from "./SimilarObjectList";
import { SpaceObjectList } from "./SpaceObjectList";
import { MyMindObject } from "../types";
import { getRelatedObjectIds } from "../object-links";

const EMPTY_DETAIL_ASSETS: DetailAssets = {};

function formatTimestamp(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toLocaleString();
}

function getUrlText(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getDimensions(object: MyMindObject): string | undefined {
  if (!object.blob?.width || !object.blob?.height) {
    return undefined;
  }

  return `${object.blob.width} × ${object.blob.height}`;
}

function getStringBody(content?: { body?: string | Record<string, unknown> }): string | undefined {
  if (typeof content?.body !== "string") {
    return undefined;
  }

  const body = content.body.trim();
  return body || undefined;
}

function getEditableNoteTarget(
  object: MyMindObject,
): { body: string; kind: "content" | "attached-note"; noteId?: string } | undefined {
  const contentBody = getStringBody(object.content);

  if (contentBody) {
    return { body: contentBody, kind: "content" };
  }

  const note = object.notes?.find((item) => getStringBody(item.content));

  if (!note) {
    return undefined;
  }

  return {
    body: getStringBody(note.content) ?? "",
    kind: "attached-note",
    noteId: note.id,
  };
}

function RenameObjectForm(props: { object: MyMindObject; onUpdated?: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { title: string }) {
    const title = values.title.trim();

    if (!title) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    setIsLoading(true);

    try {
      await updateObject(props.object.id, { title });
      await props.onUpdated?.();
      await showToast({ style: Toast.Style.Success, title: "Title updated" });
      pop();
    } catch (error) {
      if (isReadOnlyWriteError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is read-only",
          message: READ_ONLY_ACCESS_MESSAGE,
        });
        pop();
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't update title",
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
          <Action.SubmitForm title="Rename Item" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={props.object.title ?? ""} />
    </Form>
  );
}

function AddNoteToObjectForm(props: { object: MyMindObject; onCreated?: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { note: string }) {
    if (!values.note.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Note can't be empty" });
      return;
    }

    setIsLoading(true);

    try {
      await createObjectNote(props.object.id, values.note);
      await props.onCreated?.();
      await showToast({ style: Toast.Style.Success, title: "Note added" });
      pop();
    } catch (error) {
      if (isReadOnlyWriteError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is read-only",
          message: READ_ONLY_ACCESS_MESSAGE,
        });
        pop();
        return;
      }

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

function EditNoteForm(props: { object: MyMindObject; onUpdated?: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const editableNote = getEditableNoteTarget(props.object);

  if (!editableNote) {
    return (
      <Detail
        markdown="# No Editable Note\n\nThis item doesn't expose a plain-text note body through the API."
        actions={<ActionPanel />}
      />
    );
  }

  async function handleSubmit(values: { body: string }) {
    const body = values.body.trim();
    const target = editableNote!;

    if (!body) {
      await showToast({ style: Toast.Style.Failure, title: "Note body is required" });
      return;
    }

    setIsLoading(true);

    try {
      if (target.kind === "content") {
        await updateObjectContent(props.object.id, body);
      } else if (target.noteId) {
        await updateObjectNote(props.object.id, target.noteId, body);
      }

      await props.onUpdated?.();
      await showToast({ style: Toast.Style.Success, title: "Note updated" });
      pop();
    } catch (error) {
      if (isReadOnlyWriteError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is read-only",
          message: READ_ONLY_ACCESS_MESSAGE,
        });
        pop();
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't update note",
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
          <Action.SubmitForm title="Edit Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="body" title="Body" defaultValue={editableNote.body} />
    </Form>
  );
}

function RetagObjectForm(props: { object: MyMindObject; onUpdated?: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { data: tags = [] } = useCachedPromise(() => listTags(), [], { initialData: [] });
  const currentUserTags = useMemo(
    () =>
      props.object.tags
        .filter(isUserTag)
        .map((tag) => tag.name)
        .filter(Boolean),
    [props.object.tags],
  );
  const availableTags = useMemo(
    () =>
      Array.from(
        new Set([
          ...tags
            .filter(isUserTag)
            .map((tag) => tag.name)
            .filter(Boolean),
          ...currentUserTags,
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [currentUserTags, tags],
  );

  async function handleSubmit(values: { existingTags: string[]; newTags: string }) {
    const nextTags = Array.from(new Set([...values.existingTags, ...splitCommaSeparated(values.newTags)]));
    const tagsToAdd = nextTags.filter((tagName) => !currentUserTags.includes(tagName));
    const tagsToRemove = currentUserTags.filter((tagName) => !nextTags.includes(tagName)).map((name) => ({ name }));

    setIsLoading(true);

    try {
      await addTagsToObject(props.object.id, tagsToAdd);
      await removeTagsFromObject(props.object.id, tagsToRemove);
      await props.onUpdated?.();
      await showToast({ style: Toast.Style.Success, title: "Tags updated" });
      pop();
    } catch (error) {
      if (isReadOnlyWriteError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is read-only",
          message: READ_ONLY_ACCESS_MESSAGE,
        });
        pop();
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't update tags",
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
          <Action.SubmitForm title="Retag Item" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="existingTags"
        title="Tags"
        defaultValue={currentUserTags}
        storeValue={false}
        placeholder="Select your tags"
      >
        {availableTags.map((tagName) => (
          <Form.TagPicker.Item key={tagName} value={tagName} title={tagName} />
        ))}
      </Form.TagPicker>
      <Form.TextField id="newTags" title="New Tags" placeholder="Comma-separated tags" />
    </Form>
  );
}

function MoveObjectToSpaceForm(props: { object: MyMindObject; onUpdated?: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { data: spaces = [] } = useCachedPromise(() => listSpaces(), [], { initialData: [] });
  const currentSpaceIds = useMemo(() => props.object.spaces?.map((space) => space.id) ?? [], [props.object.spaces]);
  const defaultSpaceId = currentSpaceIds.length > 1 ? "__keep__" : (currentSpaceIds[0] ?? "");

  async function handleSubmit(values: { spaceId: string }) {
    if (values.spaceId === "__keep__") {
      await showToast({ style: Toast.Style.Failure, title: "Choose a destination space" });
      return;
    }

    const nextSpaceId = values.spaceId || undefined;
    const spaceIdsToRemove = currentSpaceIds.filter((spaceId) => spaceId !== nextSpaceId);
    const shouldAddSpace = nextSpaceId ? !currentSpaceIds.includes(nextSpaceId) : false;

    if (!shouldAddSpace && spaceIdsToRemove.length === 0) {
      await showToast({ style: Toast.Style.Success, title: "Space unchanged" });
      pop();
      return;
    }

    setIsLoading(true);

    try {
      if (shouldAddSpace && nextSpaceId) {
        await addObjectToSpaces(props.object.id, [nextSpaceId]);
      }

      await Promise.all(spaceIdsToRemove.map((spaceId) => removeObjectFromSpace(spaceId, props.object.id)));

      await props.onUpdated?.();
      await showToast({ style: Toast.Style.Success, title: "Space updated" });
      pop();
    } catch (error) {
      if (isReadOnlyWriteError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is read-only",
          message: READ_ONLY_ACCESS_MESSAGE,
        });
        pop();
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't move item",
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
          <Action.SubmitForm title="Move to Space" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="spaceId" title="Space" defaultValue={defaultSpaceId} storeValue={false}>
        {currentSpaceIds.length > 1 ? <Form.Dropdown.Item value="__keep__" title="Choose a Space" /> : null}
        <Form.Dropdown.Item value="" title="No Space" />
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={getSpaceIcon(space)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function ObjectActions(props: {
  object: MyMindObject;
  isDetailView?: boolean;
  onDeleted?: () => Promise<void> | void;
  onRefetch?: () => Promise<void> | void;
}) {
  const { accessKeyId, accessKeySecret, accessLevel } = getPreferenceValues<Preferences>();
  const objectUrl = getObjectUrl(props.object);
  const editableNote = getEditableNoteTarget(props.object);
  const canWrite = useWriteAccess(accessLevel, getAccessKeyScope(accessKeyId, accessKeySecret));
  const { data: links = [] } = useCachedPromise(() => listLinks(), [], { initialData: [] });
  const { data: canShowSimilarItems = false } = useCachedPromise(async () => await hasMastermindSearchAccess(), [], {
    initialData: false,
  });
  const hasRelatedItems = useMemo(
    () => getRelatedObjectIds(props.object.id, links).length > 0,
    [links, props.object.id],
  );

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
      if (isReadOnlyWriteError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is read-only",
          message: READ_ONLY_ACCESS_MESSAGE,
        });
        return;
      }

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
      await showToast({ style: Toast.Style.Success, title: "Added to Top of Mind" });
      await props.onRefetch?.();
    } catch (error) {
      if (isReadOnlyWriteError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is read-only",
          message: READ_ONLY_ACCESS_MESSAGE,
        });
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't add item to Top of Mind",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDeleteNote() {
    if (editableNote?.kind !== "attached-note" || !editableNote.noteId) {
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Note",
      message: "This removes the attached note from the item.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteObjectNote(props.object.id, editableNote.noteId);
      await showToast({ style: Toast.Style.Success, title: "Note deleted" });
      await props.onRefetch?.();
    } catch (error) {
      if (isReadOnlyWriteError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is read-only",
          message: READ_ONLY_ACCESS_MESSAGE,
        });
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't delete note",
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
            target={
              <ObjectDetail objectId={props.object.id} fallbackObject={props.object} onDeleted={props.onDeleted} />
            }
          />
        )}
        {objectUrl && <Action.OpenInBrowser url={objectUrl} />}
        <Action.OpenInBrowser title="Open in mymind" url={getMymindObjectUrl(props.object.id)} />
        {hasRelatedItems ? (
          <Action.Push
            title="Show Related Items"
            icon={Icon.Link}
            target={<RelatedObjectList object={props.object} />}
          />
        ) : null}
        {canShowSimilarItems ? (
          <Action.Push
            title="Show Similar Items"
            icon={Icon.Stars}
            target={<SimilarObjectList object={props.object} />}
          />
        ) : null}
        {canWrite ? <Action title="Add to Top of Mind" icon={Icon.LightBulb} onAction={handlePin} /> : null}
        {editableNote ? <Action.CopyToClipboard title="Copy Note Body" content={editableNote.body} /> : null}
      </ActionPanel.Section>
      {canWrite ? (
        <ActionPanel.Section>
          <Action.Push
            title="Rename Item"
            icon={Icon.Pencil}
            target={<RenameObjectForm object={props.object} onUpdated={props.onRefetch} />}
          />
          {editableNote ? (
            <Action.Push
              title="Edit Note"
              icon={Icon.Pencil}
              target={<EditNoteForm object={props.object} onUpdated={props.onRefetch} />}
            />
          ) : null}
          <Action.Push
            title="Retag Item"
            icon={Icon.Tag}
            target={<RetagObjectForm object={props.object} onUpdated={props.onRefetch} />}
          />
          <Action.Push
            title="Move to Space"
            icon={Icon.Circle}
            target={<MoveObjectToSpaceForm object={props.object} onUpdated={props.onRefetch} />}
          />
          <Action.Push
            title="Add Note"
            icon={Icon.Pencil}
            target={<AddNoteToObjectForm object={props.object} onCreated={props.onRefetch} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel.Section>
      ) : null}
      {canWrite ? (
        <ActionPanel.Section>
          {editableNote?.kind === "attached-note" && editableNote.noteId ? (
            <Action
              title="Delete Note"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDeleteNote}
            />
          ) : null}
          <Action
            title="Delete Item"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDelete}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}

export function ObjectDetail(props: {
  objectId: string;
  fallbackObject?: MyMindObject;
  onDeleted?: () => Promise<void> | void;
}) {
  const { pop, push } = useNavigation();
  const [assets, setAssets] = useState<DetailAssets>(EMPTY_DETAIL_ASSETS);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const {
    data: object,
    isLoading: isObjectLoading,
    revalidate,
  } = useCachedPromise(getObject, [props.objectId], {
    initialData: props.fallbackObject,
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load item details" });
    },
  });
  const { data: spaces = [] } = useCachedPromise(() => listSpaces(), [], { initialData: [] });

  const resolvedSpaces = useMemo(() => {
    if (!object?.spaces?.length) {
      return [];
    }

    const spacesById = new Map(spaces.map((space) => [space.id, space]));
    return object.spaces.map((space) => spacesById.get(space.id) ?? { id: space.id, name: space.id });
  }, [object?.spaces, spaces]);
  const mainEntityName = getMainEntityDisplayName(object?.mainEntity);
  const mainEntityTypes = getMainEntityTypeNames(object?.mainEntity);
  const objectUrl = object ? getObjectUrl(object) : undefined;
  const originalSourceUrl = object?.source?.url;

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      if (!object) {
        setAssets(EMPTY_DETAIL_ASSETS);
        return;
      }

      setIsAssetsLoading(true);

      try {
        const nextAssets = await loadObjectDetailAssets(object, { thumbnailSize: "1400x1400" });

        if (!cancelled) {
          setAssets(nextAssets);
        }
      } finally {
        if (!cancelled) {
          setIsAssetsLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [object, objectUrl]);

  return (
    <Detail
      isLoading={isObjectLoading || isAssetsLoading}
      markdown={object ? getObjectDetailMarkdown(object, assets) : "# Loading…"}
      metadata={
        object ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Type" text={getObjectTypeLabel(object)} />
            {mainEntityName && <Detail.Metadata.Label title="Main Entity" text={mainEntityName} />}
            {mainEntityTypes.length > 0 && (
              <Detail.Metadata.Label title="Entity Types" text={mainEntityTypes.join(", ")} />
            )}
            {getDimensions(object) && <Detail.Metadata.Label title="Dimensions" text={getDimensions(object)} />}
            {object.notes?.length ? (
              <Detail.Metadata.Label title="Attached Notes" text={`${object.notes.length}`} />
            ) : null}
            {objectUrl ? (
              <Detail.Metadata.Label title="Site" text={getUrlText(objectUrl)} icon={getObjectIcon(object)} />
            ) : null}
            {objectUrl ? (
              <Detail.Metadata.Link title="Source URL" target={objectUrl} text={getUrlText(objectUrl)} />
            ) : null}
            {originalSourceUrl && originalSourceUrl !== objectUrl ? (
              <Detail.Metadata.Link
                title="Original Source"
                target={originalSourceUrl}
                text={getUrlText(originalSourceUrl)}
              />
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Created" text={formatTimestamp(object.created) ?? object.created} />
            <Detail.Metadata.Label title="Modified" text={formatTimestamp(object.modified) ?? object.modified} />
            <Detail.Metadata.Label title="Bumped" text={formatTimestamp(object.bumped) ?? object.bumped} />
            {object.deleted ? (
              <Detail.Metadata.Label title="Deleted" text={formatTimestamp(object.deleted) ?? object.deleted} />
            ) : null}
            {resolvedSpaces.length > 0 ? (
              <Detail.Metadata.TagList title="Spaces">
                {resolvedSpaces.map((space) => (
                  <Detail.Metadata.TagList.Item
                    key={space.id}
                    text={space.name}
                    onAction={() => push(<SpaceObjectList space={space} />)}
                  />
                ))}
              </Detail.Metadata.TagList>
            ) : null}
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
      actions={
        object ? (
          <ObjectActions
            object={object}
            isDetailView={true}
            onDeleted={async () => {
              await props.onDeleted?.();
              pop();
            }}
            onRefetch={revalidate}
          />
        ) : (
          <ActionPanel />
        )
      }
    />
  );
}
