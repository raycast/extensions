import { Action, ActionPanel, captureException, Icon, List } from "@raycast/api";
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
      await showFailureToast("Could not load stacks", error);
    }

    return data.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteStack(id);
      revalidate();
    } catch (error) {
      captureException(error);
      await showFailureToast("Could not delete stack", error);
    }
  };

  return (
    <List isLoading={isLoading}>
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
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
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
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<NewStackFieldForm onAdd={revalidate} stackId={id} />}
                />

                <Action
                  title="Delete Stack"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDelete(id)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
