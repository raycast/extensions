import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Spaces } from "./api/resources";
import type { Space } from "./api/types";
import { showKyoError } from "./lib/helpers";
import { SpaceProjectsList } from "./components/SpaceProjects";
import CreateSpace from "./create-space";
import CreateProject from "./create-project";
import { LogOutAction } from "./components/AuthActions";

export default function SearchSpaces() {
  const {
    data: spaces,
    isLoading,
    revalidate,
  } = useCachedPromise(() => Spaces.list(), [], { initialData: [] });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces by name…">
      <List.EmptyView
        title="No spaces"
        description="Create a client space to get started."
        icon={Icon.AppWindowGrid3x3}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Space"
              icon={Icon.Plus}
              target={<CreateSpace />}
              onPop={revalidate}
            />
          </ActionPanel>
        }
      />
      {spaces.map((space) => (
        <List.Item
          key={space.id}
          icon={
            space.image_url
              ? { source: space.image_url }
              : { source: Icon.AppWindowGrid3x3, tintColor: Color.Magenta }
          }
          title={space.name}
          accessories={[
            space.is_default
              ? { tag: { value: "Default", color: Color.Blue } }
              : {},
            space.status ? { text: space.status } : {},
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="View Projects"
                  icon={Icon.Folder}
                  target={
                    <SpaceProjectsList
                      spaceId={space.id}
                      spaceName={space.name}
                    />
                  }
                />
                <Action.Push
                  title="Create Project"
                  icon={Icon.Plus}
                  target={<CreateProject presetSpaceId={space.id} />}
                  onPop={revalidate}
                />
                <Action.Push
                  title="Edit Space"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<EditSpaceForm space={space} onSaved={revalidate} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Create Space"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreateSpace />}
                  onPop={revalidate}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <LogOutAction />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function EditSpaceForm({
  space,
  onSaved,
}: {
  space: Space;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();

  async function submit(values: {
    name: string;
    status: string;
    notes: string;
    is_default: boolean;
  }) {
    try {
      // PATCH semantics: null CLEARS a field, undefined leaves it untouched.
      await Spaces.update(space.id, {
        name: values.name.trim(),
        status: values.status || null,
        notes: values.notes || null,
        is_default: values.is_default,
      });
      await showToast({ style: Toast.Style.Success, title: "Space updated" });
      onSaved?.();
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to update space");
    }
  }

  return (
    <Form
      navigationTitle={`Edit · ${space.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={space.name} />
      <Form.TextField
        id="status"
        title="Status"
        defaultValue={space.status ?? ""}
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        defaultValue={space.notes ?? ""}
      />
      <Form.Checkbox
        id="is_default"
        label="Default space"
        defaultValue={space.is_default ?? false}
      />
    </Form>
  );
}
