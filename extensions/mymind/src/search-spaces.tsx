import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { useWriteAccess } from "./access-control";
import { getMymindSpaceUrl } from "./helpers";
import {
  createSpace,
  deleteSpace,
  isReadOnlyWriteError,
  listSpaces,
  READ_ONLY_ACCESS_MESSAGE,
  updateSpace,
} from "./api";
import { SpaceObjectList } from "./components/SpaceObjectList";
import { Preferences, Space } from "./types";

const SPACE_COLOR_OPTIONS = [
  { title: "Red", value: "#ef3e4a" },
  { title: "Pink", value: "#ff8fa4" },
  { title: "Mauve", value: "#cba0aa" },
  { title: "Peach", value: "#ffdcd0" },
  { title: "Coral", value: "#ff9770" },
  { title: "Orange", value: "#f96" },
  { title: "Yellow", value: "#fdf06f" },
  { title: "Lime", value: "#cdff06" },
  { title: "Mint", value: "#75ffc0" },
  { title: "Emerald", value: "#17c37b" },
  { title: "Teal", value: "#06d6a0" },
  { title: "Ice", value: "#96cbd1" },
  { title: "Cyan", value: "#19aad1" },
  { title: "Sky", value: "#70d6ff" },
  { title: "Blue", value: "#166ff4" },
  { title: "Iris", value: "#b388eb" },
  { title: "Lavender", value: "#bfb5d7" },
  { title: "Purple", value: "#7a30cf" },
  { title: "Black", value: "#000" },
  { title: "Silver", value: "#c0c2ce" },
] as const;

function isSupportedColor(value?: string): value is string {
  if (!value) {
    return false;
  }

  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value.trim());
}

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

function getSpaceIcon(space: Space) {
  return {
    source: Icon.Circle,
    tintColor: isSupportedColor(space.color) ? space.color : Color.SecondaryText,
  };
}

function getColorOptionIcon(value: string) {
  return {
    source: Icon.Circle,
    tintColor: value,
  };
}

function EditSpaceForm(props: { space: Space; onUpdated: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const defaultColorOption = isSupportedColor(props.space.color)
    ? normalizeColor(props.space.color)
    : normalizeColor(SPACE_COLOR_OPTIONS[0].value);

  async function handleSubmit(values: { name: string; colorOption: string }) {
    const trimmedName = values.name.trim();
    const nextColor = values.colorOption;

    if (!trimmedName) {
      await showToast({ style: Toast.Style.Failure, title: "Space name is required" });
      return;
    }

    const nameChanged = trimmedName !== props.space.name;
    const colorChanged = normalizeColor(nextColor ?? "") !== normalizeColor(props.space.color ?? "");

    if (!nameChanged && !colorChanged) {
      await showToast({ style: Toast.Style.Success, title: "Space unchanged" });
      pop();
      return;
    }

    setIsLoading(true);

    try {
      await updateSpace(props.space.id, {
        name: nameChanged ? trimmedName : undefined,
        color: colorChanged ? nextColor : undefined,
      });
      await props.onUpdated();
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
        title: "Couldn't update space",
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
          <Action.SubmitForm title="Edit Space" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={props.space.name} />
      <Form.Dropdown id="colorOption" title="Color" defaultValue={defaultColorOption} storeValue={false}>
        {SPACE_COLOR_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={normalizeColor(option.value)}
            title={option.title}
            icon={getColorOptionIcon(option.value)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function CreateSpaceForm(props: { onCreated: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { name: string; colorOption: string }) {
    const name = values.name.trim();

    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Space name is required" });
      return;
    }

    setIsLoading(true);

    try {
      await createSpace({
        name,
        color: values.colorOption,
      });
      await props.onCreated();
      await showToast({ style: Toast.Style.Success, title: "Space created" });
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
        title: "Couldn't create space",
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
          <Action.SubmitForm title="Create Space" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Space name" />
      <Form.Dropdown
        id="colorOption"
        title="Color"
        defaultValue={normalizeColor(SPACE_COLOR_OPTIONS[0].value)}
        storeValue={false}
      >
        {SPACE_COLOR_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={normalizeColor(option.value)}
            title={option.title}
            icon={getColorOptionIcon(option.value)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function SpaceListItemActions(props: {
  canWrite: boolean;
  space: Space;
  onDeleted: () => Promise<void> | void;
  onUpdated: () => Promise<void> | void;
}) {
  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Space",
      message: `Delete ${props.space.name}? Items inside will stay in mymind.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteSpace(props.space.id);
      await props.onDeleted();
      await showToast({ style: Toast.Style.Success, title: "Space deleted" });
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
        title: "Couldn't delete space",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push title="Show Items" icon={Icon.List} target={<SpaceObjectList space={props.space} />} />
        <Action.OpenInBrowser title="Open in Mymind" url={getMymindSpaceUrl(props.space.id)} />
        {props.canWrite ? (
          <Action.Push title="Create Space" icon={Icon.Plus} target={<CreateSpaceForm onCreated={props.onUpdated} />} />
        ) : null}
        {props.canWrite ? (
          <Action.Push
            title="Edit Space"
            icon={Icon.Pencil}
            target={<EditSpaceForm space={props.space} onUpdated={props.onUpdated} />}
          />
        ) : null}
      </ActionPanel.Section>
      {props.canWrite ? (
        <ActionPanel.Section>
          <Action
            title="Delete Space"
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

export default function SearchSpacesCommand() {
  const { accessKeyId, accessKeySecret, accessLevel } = getPreferenceValues<Preferences>();
  const [deletedSpaceIds, setDeletedSpaceIds] = useState<Set<string>>(new Set());
  const canWrite = useWriteAccess(accessLevel, `${accessKeyId}:${accessKeySecret}`);
  const {
    data: spaces = [],
    isLoading,
    revalidate,
  } = useCachedPromise(() => listSpaces(), [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load your spaces" });
    },
  });

  async function handleSpacesUpdated() {
    await revalidate();
  }

  async function handleSpaceDeleted(spaceId: string) {
    setDeletedSpaceIds((current) => new Set(current).add(spaceId));
    await revalidate();
  }

  const visibleSpaces = useMemo(
    () => spaces.filter((space) => !deletedSpaceIds.has(space.id)),
    [deletedSpaceIds, spaces],
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces…">
      {visibleSpaces.length === 0 ? (
        <List.EmptyView
          title="No Spaces"
          description="You haven't created any spaces yet."
          actions={
            canWrite ? (
              <ActionPanel>
                <Action.Push
                  title="Create Space"
                  icon={Icon.Plus}
                  target={<CreateSpaceForm onCreated={handleSpacesUpdated} />}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : null}
      {visibleSpaces.map((space) => (
        <List.Item
          key={space.id}
          icon={getSpaceIcon(space)}
          title={space.name}
          actions={
            <SpaceListItemActions
              canWrite={canWrite}
              space={space}
              onDeleted={() => handleSpaceDeleted(space.id)}
              onUpdated={handleSpacesUpdated}
            />
          }
        />
      ))}
    </List>
  );
}
