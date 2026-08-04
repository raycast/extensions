import {
  Action,
  ActionPanel,
  Alert,
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
import { getAccessKeyScope, useWriteAccess } from "./access-control";
import { getErrorEmptyView } from "./error-utils";
import { getMymindSpaceUrl, getSpaceIcon, isSupportedColor } from "./helpers";
import {
  createSpace,
  deleteSpace,
  isReadOnlyWriteError,
  listSpaces,
  READ_ONLY_ACCESS_MESSAGE,
  updateSpace,
} from "./api";
import { SpaceObjectList } from "./components/SpaceObjectList";
import { normalizeColor, SPACE_COLOR_OPTIONS } from "./space-colors";
import { Space } from "./types";

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
        <Action.OpenInBrowser title="Open in mymind" url={getMymindSpaceUrl(props.space.id)} />
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
  const canWrite = useWriteAccess(accessLevel, getAccessKeyScope(accessKeyId, accessKeySecret));
  const {
    data: spaces = [],
    isLoading,
    error,
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
  const errorEmptyView = error ? getErrorEmptyView(error, "Couldn't load your spaces") : undefined;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces…">
      {visibleSpaces.length === 0 ? (
        <List.EmptyView
          title={errorEmptyView?.title ?? "No Spaces"}
          description={errorEmptyView?.description ?? "You haven't created any spaces yet."}
          actions={
            !errorEmptyView && canWrite ? (
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
