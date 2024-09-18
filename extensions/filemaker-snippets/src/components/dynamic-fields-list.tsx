import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadSingleSnippet, saveSnippetFile } from "../utils/snippets";
import { Snippet, SnippetWithPath } from "../utils/types";
import DynamicSnippetHelp from "./dynamic-snippet.help";
import EditField from "./edit-field";

async function removeField(snippet: SnippetWithPath, field: Snippet["dynamicFields"][number]) {
  const newSnippet: SnippetWithPath = {
    ...snippet,
    dynamicFields: snippet.dynamicFields.filter((f) => f.name !== field.name),
  };
  await saveSnippetFile(newSnippet, snippet.path);
}

export default function DynamicFieldsList(props: { snippet: SnippetWithPath; revalidate: () => void }) {
  const { pop } = useNavigation();
  const { data, mutate } = usePromise(async () => loadSingleSnippet(props.snippet.path));
  const snippet: SnippetWithPath = { ...props.snippet, ...data, locId: props.snippet.locId };

  function AddEditFieldAction(args?: { field?: Snippet["dynamicFields"][number] }) {
    const isEdit = !!args?.field?.name;
    return (
      <Action.Push
        title={isEdit ? "Edit Field" : "Add New Field"}
        icon={isEdit ? Icon.Pencil : Icon.Plus}
        shortcut={{ key: isEdit ? "e" : "n", modifiers: ["cmd"] }}
        target={
          <EditField
            snippet={snippet}
            field={args?.field}
            onSubmit={() => {
              mutate();
              props.revalidate();
              pop();
            }}
          />
        }
      />
    );
  }
  function RemoveFieldAction({ field }: { field: Snippet["dynamicFields"][number] }) {
    return (
      <Action
        title="Remove Field"
        icon={Icon.Trash}
        shortcut={{ key: "delete", modifiers: ["cmd"] }}
        onAction={async () => {
          if (
            await confirmAlert({
              icon: Icon.Trash,
              title: "Are you sure?",
              message: "This edits the snippet file directly and cannot be undone.",
              primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
            })
          ) {
            mutate(removeField(snippet, field));
            props.revalidate();
          }
        }}
      />
    );
  }

  return (
    <List
      searchBarPlaceholder="Filter Fields"
      navigationTitle="Edit Dynamic Fields"
      actions={
        <ActionPanel>
          <AddEditFieldAction />
          <HelpAction />
        </ActionPanel>
      }
    >
      {snippet.dynamicFields.length === 0 && (
        <List.EmptyView
          title="Add a field to make this a dynamic snippet"
          description="or check out the actions menu for a help guide"
          icon={Icon.Stars}
        />
      )}
      <List.Section title={snippet.name}>
        {snippet.dynamicFields.map((field) => (
          <List.Item
            key={field.name}
            title={field.nameFriendly}
            subtitle={field.name}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <AddEditFieldAction field={field} />
                  <RemoveFieldAction field={field} />
                </ActionPanel.Section>

                <AddEditFieldAction />
                <HelpAction />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function HelpAction() {
  return <Action.Push target={<DynamicSnippetHelp />} title="Help" icon={Icon.QuestionMarkCircle} />;
}
