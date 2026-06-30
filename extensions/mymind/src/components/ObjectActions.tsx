import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  LaunchType,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  launchCommand,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  createObjectNote,
  deleteObject,
  getObject,
  listSpaces,
  pinObjectToTopOfMind,
} from "../api";
import { getMymindObjectUrl, getObjectIcon, getObjectTypeLabel, getObjectUrl } from "../helpers";
import { loadObjectDetailAssets } from "../object-assets";
import { DetailAssets, getMainEntityDisplayName, getMainEntityTypeNames, getObjectDetailMarkdown } from "../object-detail";
import { MyMindObject, Space } from "../types";

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

function getSpaceColor(space?: Space): string | undefined {
  return space?.color && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(space.color.trim()) ? space.color : undefined;
}

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
      await showToast({ style: Toast.Style.Success, title: "Added to Top of Mind" });
      await props.onRefetch?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't add item to Top of Mind",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleQuickNote() {
    await launchCommand({
      name: "save-to-mymind",
      type: LaunchType.UserInitiated,
      context: {
        forceKind: "note",
        ignoreDetectedInput: true,
      },
    });
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!props.isDetailView && (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<ObjectDetail objectId={props.object.id} fallbackObject={props.object} onDeleted={props.onDeleted} />}
          />
        )}
        {objectUrl && <Action.OpenInBrowser url={objectUrl} />}
        <Action.OpenInBrowser title="Open in Mymind" url={getMymindObjectUrl(props.object.id)} />
        <Action title="Add to Top of Mind" icon={Icon.LightBulb} onAction={handlePin} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Add Note"
          icon={Icon.Pencil}
          target={<AddNoteToObjectForm object={props.object} onCreated={props.onRefetch} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action title="Quick Note" icon={Icon.Document} onAction={handleQuickNote} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Item"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDelete}
          shortcut={Keyboard.Shortcut.Common.Remove}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ObjectDetail(props: {
  objectId: string;
  fallbackObject?: MyMindObject;
  onDeleted?: () => Promise<void> | void;
}) {
  const { pop } = useNavigation();
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
            {mainEntityTypes.length > 0 && <Detail.Metadata.Label title="Entity Types" text={mainEntityTypes.join(", ")} />}
            {object.blob?.type && <Detail.Metadata.Label title="MIME Type" text={object.blob.type} />}
            {getDimensions(object) && <Detail.Metadata.Label title="Dimensions" text={getDimensions(object)} />}
            {object.notes?.length ? <Detail.Metadata.Label title="Attached Notes" text={`${object.notes.length}`} /> : null}
            {object.summary ? <Detail.Metadata.Label title="Summary" text={object.summary} /> : null}
            {objectUrl ? <Detail.Metadata.Label title="Site" text={getUrlText(objectUrl)} icon={getObjectIcon(object)} /> : null}
            {objectUrl ? <Detail.Metadata.Link title="Source URL" target={objectUrl} text={getUrlText(objectUrl)} /> : null}
            {originalSourceUrl && originalSourceUrl !== objectUrl ? (
              <Detail.Metadata.Link title="Original Source" target={originalSourceUrl} text={getUrlText(originalSourceUrl)} />
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Created" text={formatTimestamp(object.created) ?? object.created} />
            <Detail.Metadata.Label title="Modified" text={formatTimestamp(object.modified) ?? object.modified} />
            <Detail.Metadata.Label title="Bumped" text={formatTimestamp(object.bumped) ?? object.bumped} />
            {object.deleted ? <Detail.Metadata.Label title="Deleted" text={formatTimestamp(object.deleted) ?? object.deleted} /> : null}
            {resolvedSpaces.length > 0 ? (
              <Detail.Metadata.TagList title="Spaces">
                {resolvedSpaces.map((space) => (
                  <Detail.Metadata.TagList.Item
                    key={space.id}
                    text={space.name}
                    color={getSpaceColor(space)}
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
