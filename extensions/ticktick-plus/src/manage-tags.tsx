import { List, Icon, ActionPanel, Action, showToast, Toast, Form, Color } from "@raycast/api";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { createTag, renameTag, deleteTag } from "./api/ticktick";
import { Clipboard } from "@raycast/api";

function CreateTagForm({ onCreated }: { onCreated: () => void }) {
  return (
    <Form
      navigationTitle="New Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Tag"
            onSubmit={async (values: { name: string; color: string }) => {
              if (!values.name.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Name is required" });
                return;
              }
              try {
                await createTag(values.name.trim(), values.color || undefined);
                await showToast({ style: Toast.Style.Success, title: "Tag created" });
                onCreated();
              } catch (err) {
                await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Tag Name" placeholder="work" />
      <Form.TextField id="color" title="Color" placeholder="#4A90E2" />
    </Form>
  );
}

export default function ManageTags() {
  useAlerts();
  const { data, isLoading, revalidate } = useSync();

  const tagTaskCounts = new Map<string, number>();
  for (const task of data.tasks) {
    for (const tag of task.tags ?? []) {
      tagTaskCounts.set(tag, (tagTaskCounts.get(tag) ?? 0) + 1);
    }
  }

  const allTags = [
    ...data.tags.map((t) => t.name),
    ...[...tagTaskCounts.keys()].filter((n) => !data.tags.some((t) => t.name === n)),
  ];

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Tags"
      searchBarPlaceholder="Search tags..."
      actions={
        <ActionPanel>
          <Action.Push title="Create Tag" icon={Icon.Plus} target={<CreateTagForm onCreated={revalidate} />} />
        </ActionPanel>
      }
    >
      {allTags.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Tag} title="No tags" />
      ) : (
        <List.Section title={`${allTags.length} tag${allTags.length !== 1 ? "s" : ""}`}>
          {allTags.map((name) => {
            const apiTag = data.tags.find((t) => t.name === name);
            const count = tagTaskCounts.get(name) ?? 0;
            return (
              <List.Item
                key={name}
                icon={{ source: Icon.Tag, tintColor: (apiTag?.color as Color) ?? Color.Blue }}
                title={name}
                accessories={[{ text: `${count} task${count !== 1 ? "s" : ""}` }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Create Tag"
                      icon={Icon.Plus}
                      target={<CreateTagForm onCreated={revalidate} />}
                    />
                    <Action
                      title="Rename Tag"
                      icon={Icon.Pencil}
                      onAction={async () => {
                        const newName = await Clipboard.readText();
                        if (!newName?.trim()) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Copy new tag name to clipboard first",
                          });
                          return;
                        }
                        try {
                          await renameTag(name, newName.trim());
                          await showToast({ style: Toast.Style.Success, title: "Tag renamed" });
                          revalidate();
                        } catch (err) {
                          await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                        }
                      }}
                    />
                    <Action
                      title="Delete Tag"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        try {
                          await deleteTag(name);
                          await showToast({ style: Toast.Style.Success, title: "Tag deleted" });
                          revalidate();
                        } catch (err) {
                          await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                        }
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
