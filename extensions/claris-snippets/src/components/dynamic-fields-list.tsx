import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadSingleSnippet } from "../utils/snippets";
import { Snippet, SnippetWithPath } from "../utils/types";
import EditField from "./edit-field";

async function reload(path: string) {
  return loadSingleSnippet(path);
}

export default function DynamicFieldsList(props: { snippet: SnippetWithPath; revalidate: () => void }) {
  const { pop } = useNavigation();
  const { data, mutate } = usePromise(async () => loadSingleSnippet(props.snippet.path));
  const snippet: SnippetWithPath = { ...props.snippet, ...data, locId: props.snippet.locId };

  console.log("snippet", snippet.path);

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
              mutate(reload(props.snippet.path));
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
        onAction={() => {
          console.log("remove field");
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
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function HelpAction() {
  return <Action.Push target={<Detail></Detail>} title="Help" icon={Icon.QuestionMarkCircle} />;
}
