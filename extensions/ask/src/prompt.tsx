import { useState } from "react";
import { matchSorter } from "match-sorter";
import { Action, ActionPanel, Icon, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { usePrompt } from "./hooks/usePrompt";
import { Prompt, PromptHook } from "./type";
import { DestructiveAction } from "./components/actions";
import { PromptForm } from "./components/prompt-form";
import Ask from "./ask";

export default function PromptCommand() {
  const promptHook = usePrompt();
  const { data, isLoading, update, remove, clear } = promptHook;
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");

  interface ActionItem {
    name: string;
    onAction: () => void;
  }

  const actionItems: ActionItem[] = [
    {
      name: "Add new prompt",
      onAction: () => {
        push(<PromptForm hooks={{ promptHook }} />);
      },
    },
  ];

  const matchingPrompts = matchSorter(data, searchText, {
    keys: ["name"],
    sorter: (matchedItems) => matchedItems.sort((a, b) => b.item.last_used_100ms_epoch - a.item.last_used_100ms_epoch),
  });

  const matchingActions = matchSorter(actionItems, searchText, {
    keys: ["name"],
  });

  // create a new adhoc prompt if there is nonw
  // useEffect(() => {
  //   if (matchingActions.length == 0 && matchingPrompts.length == 0) {
  //     push(<Ask systemPrompt={searchText} />);
  //     setSearchText("");
  //   }
  // }, [matchingActions, matchingPrompts, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={"Select prompt or ask question..."}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Prompts">
        {matchingPrompts.map((prompt, index) => {
          return (
            <PromptItem
              key={prompt.name}
              prompt={prompt}
              index={index}
              update={update}
              remove={remove}
              clear={clear}
              promptHook={promptHook}
            />
          );
        })}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          {matchingActions.map((action) => (
            <List.Item
              key={action.name}
              icon={Icon.PlusCircleFilled}
              title={action.name}
              actions={
                <ActionPanel>
                  <Action icon={Icon.ArrowRight} title={action.name} onAction={action.onAction} />
                  <ActionPanel.Section title="General">
                    <DestructiveAction
                      title="Reset All"
                      dialog={{
                        title: "Are you sure? This will delete all your prompts.",
                      }}
                      onAction={() => promptHook.clear()}
                    />
                    <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function PromptItem(props: {
  prompt: Prompt;
  index: number;
  update: (prompt: Prompt) => Promise<void>;
  remove: (prompt: Prompt) => Promise<void>;
  clear: () => Promise<void>;
  promptHook: PromptHook;
}) {
  const { push } = useNavigation();
  const { promptHook } = props;
  return (
    <List.Item
      icon={Icon.TextSelection}
      title={props.prompt.name}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowRight}
            title="Continue with Prompt"
            onAction={() => {
              props.update({ ...props.prompt, last_used_100ms_epoch: new Date().valueOf() / 100 });
              push(<Ask systemPrompt={props.prompt.system_prompt} />);
            }}
          />
          <ActionPanel.Section title="Edit">
            <Action
              title="Edit Prompt"
              icon={Icon.Pencil}
              onAction={() => {
                push(<PromptForm hooks={{ promptHook }} prompt={props.prompt} />);
              }}
            />
            <DestructiveAction
              title="Delete"
              dialog={{
                title: "Are you sure you want to delete this prompt?",
              }}
              onAction={() => props.remove(props.prompt)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="General">
            <Action
              title="Create New Prompt"
              icon={Icon.PlusCircleFilled}
              onAction={() => {
                push(<PromptForm hooks={{ promptHook }} />);
              }}
            />
            <DestructiveAction
              title="Reset All"
              dialog={{
                title: "Are you sure? This will delete all your prompts.",
              }}
              onAction={() => props.clear()}
            />
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[{ tag: props.prompt.option }]}
    />
  );
}
