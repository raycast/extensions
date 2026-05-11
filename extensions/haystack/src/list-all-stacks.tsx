import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { EditStackForm } from "./components/edit-stack-form";
import { NewStackFieldForm } from "./components/new-stack-field-form";
import { StackFieldsList } from "./components/stack-fields-list";
import type { Stack } from "./types";
import { deleteStack, getStacks } from "./utils/stacks";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(async () => {
    let data: Stack[] = [];

    try {
      data = await getStacks();
    } catch (error) {
      captureException(error);
      await showFailureToast(error, { title: "Could not load stacks" });
    }

    return data.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Stack",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await deleteStack(id);
      revalidate();
    } catch (error) {
      captureException(error);
      await showFailureToast(error, { title: "Could not delete stack" });
    }
  };

  const handleCreateStack = async () => {
    try {
      await launchCommand({ name: "create-new-stack", type: LaunchType.UserInitiated });
    } catch (error) {
      captureException(error);
      await showFailureToast(error, { title: "Could not open Create New Stack command" });
    }
  };

  return (
    <List isLoading={isLoading}>
      {!data?.length && (
        <List.EmptyView
          icon={Icon.Box}
          title="No Stacks Found"
          description="Create your first stack to start organizing your captures"
          actions={
            <ActionPanel>
              <Action
                title="Create New Stack"
                icon={Icon.PlusSquare}
                onAction={handleCreateStack}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      )}
      {data?.map(({ id, name, icon, description, fields }) => {
        return (
          <List.Item
            key={id}
            icon={icon}
            title={name.value}
            subtitle={description}
            keywords={fields.map((field) => field.label.value)}
            accessories={[
              {
                tag: fields.length.toString() + " field" + (fields.length === 1 ? "" : "s"),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="List Fields" icon={Icon.List} target={<StackFieldsList stackId={id} />} />
                <Action.Push
                  title="Edit Stack"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <EditStackForm
                      name={name.value}
                      icon={icon}
                      description={description}
                      id={id}
                      onUpdate={revalidate}
                    />
                  }
                />
                <Action.Push
                  title="Add New Field"
                  icon={Icon.PlusSquare}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<NewStackFieldForm onAdd={revalidate} stackId={id} />}
                />

                <Action
                  title="Delete Stack"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDelete(id, name.value)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
