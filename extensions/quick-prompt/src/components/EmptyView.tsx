import { ActionPanel, List } from "@raycast/api";
import { Filter, Prompt, PromptFormValues } from "../types";
import { CreatePromptAction } from "./CreatePromptAction";
import { ImportPromptsAction } from "./ImportPromptsAction";

export function EmptyView(props: {
  prompts: Prompt[];
  filter?: Filter;
  searchText: string;
  onCreate: (values: PromptFormValues) => void;
  onImport?: (prompts: Prompt[]) => void;
  currentPrompts?: Prompt[];
}) {
  const filter = props.filter ?? Filter.All;

  if (props.prompts.length > 0) {
    return (
      <List.EmptyView
        icon="😕"
        title="No matching prompts found"
        description={`Can't find a prompt matching ${props.searchText}.\nCreate it now!`}
        actions={
          <ActionPanel>
            <CreatePromptAction defaultTitle={props.searchText} onCreate={props.onCreate} />
            {props.onImport && <ImportPromptsAction onImport={props.onImport} currentPrompts={props.currentPrompts} />}
          </ActionPanel>
        }
      />
    );
  }

  switch (filter) {
    case Filter.Enabled: {
      return (
        <List.EmptyView
          icon="😢"
          title="No prompts is enabled"
          description="Uh-oh, looks like you don't have any enabled prompts yet."
          actions={
            <ActionPanel>
              <CreatePromptAction defaultTitle={props.searchText} onCreate={props.onCreate} />
              {props.onImport && (
                <ImportPromptsAction onImport={props.onImport} currentPrompts={props.currentPrompts} />
              )}
            </ActionPanel>
          }
        />
      );
    }
    case Filter.Disabled: {
      return (
        <List.EmptyView
          icon="😢"
          title="No prompts is disabled"
          description="Uh-oh, looks like you don't have any disabled prompts yet."
          actions={
            <ActionPanel>
              <CreatePromptAction defaultTitle={props.searchText} onCreate={props.onCreate} />
              {props.onImport && (
                <ImportPromptsAction onImport={props.onImport} currentPrompts={props.currentPrompts} />
              )}
            </ActionPanel>
          }
        />
      );
    }
    case Filter.All:
    default: {
      return (
        <List.EmptyView
          icon="📝"
          title="No prompts found"
          description="You don't have any prompts yet. Why not add some?"
          actions={
            <ActionPanel>
              <CreatePromptAction defaultTitle={props.searchText} onCreate={props.onCreate} />
              {props.onImport && (
                <ImportPromptsAction onImport={props.onImport} currentPrompts={props.currentPrompts} />
              )}
            </ActionPanel>
          }
        />
      );
    }
  }
}
