import { useEffect, useState } from "react";
import { defaultBaseSortFn, matchSorter } from "match-sorter";
import { Action, ActionPanel, Icon, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { usePrompt } from "./hooks/usePrompt";
import { Conversation, Prompt, PromptHook } from "./type";
import { PrimaryAction, DestructiveAction } from "./actions";
import { PromptForm } from "./views/prompt/form";
import { v4 as uuidv4 } from "uuid";
import Ask from "./ask";
import { apiPreferences } from "./utils";

export default function PromptCommand() {
  let prompts = usePrompt();
  let { data, isLoading, update, remove, clear } = prompts;
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");

  interface ActionItem {
    title: string;
    onAction: () => void;
  }

  let actionItems: ActionItem[] = [
    {
      title: "Add new prompt",
      onAction: () => {
        push(<PromptForm use={{ prompts }} />);
      },
    },
  ];

  let matchingPrompts = matchSorter(data, searchText, {
    keys: ["name"],
    sorter: (matchedItems) => matchedItems.sort(defaultBaseSortFn),
  });

  let matchingActions = matchSorter(actionItems, searchText, {
    keys: ["title"],
    sorter: (matchedItems) => matchedItems.sort(defaultBaseSortFn),
  });

  useEffect(() => {
    if (matchingActions.length == 0 && matchingPrompts.length == 0) {
      let conversation: Conversation = {
        id: uuidv4(),
        chats: [],
        prompt: {
          id: uuidv4(),
          updated_at: "",
          created_at: new Date().toISOString(),
          name: searchText,
          prompt: searchText,
          option: apiPreferences().models[0],
          apiEndpoint: apiPreferences().url,
          apiEndpointName: apiPreferences().name,
          temperature: "1",
        },
        updated_at: "",
        created_at: new Date().toISOString(),
      };
      setSearchText("");
      push(<Ask initialQuestion={searchText} conversation={conversation} />);
    }
  }, [matchingActions, matchingPrompts, searchText]);

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
              key={prompt.id}
              prompt={prompt}
              index={index}
              update={update}
              remove={remove}
              clear={clear}
              prompts={prompts}
            />
          );
        })}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          {matchingActions.map((action) => (
            <List.Item
              key={action.title}
              icon={Icon.PlusCircleFilled}
              title={action.title}
              actions={
                <ActionPanel>
                  <PrimaryAction title={action.title} onAction={action.onAction} />
                  <ActionPanel.Section title="General">
                    <DestructiveAction
                      title="Delete All"
                      dialog={{
                        title: "Are you sure you want to delete all your prompts?",
                      }}
                      onAction={() => prompts.clear()}
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
  prompts: PromptHook;
}) {
  const { push } = useNavigation();
  const { prompts } = props;
  return (
    <List.Item
      icon={Icon.ArrowRight}
      title={props.prompt.name}
      actions={
        <ActionPanel>
          <PrimaryAction
            title="Continue with prompt"
            onAction={() => {
              let conversation: Conversation = {
                id: uuidv4(),
                chats: [],
                prompt: props.prompt,
                updated_at: "",
                created_at: new Date().toISOString(),
              };
              push(<Ask conversation={conversation} />);
            }}
          />
          <ActionPanel.Section title="Edit">
            <Action
              title="Edit prompt"
              icon={Icon.Pencil}
              onAction={() => {
                push(<PromptForm use={{ prompts }} prompt={props.prompt} />);
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
              title="Create new prompt"
              icon={Icon.PlusCircleFilled}
              onAction={() => {
                push(<PromptForm use={{ prompts }} />);
              }}
            />
            <DestructiveAction
              title="Delete All"
              dialog={{
                title: "Are you sure you want to delete all your saved prompts?",
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
