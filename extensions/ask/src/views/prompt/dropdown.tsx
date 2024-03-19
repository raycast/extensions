import { List, LocalStorage } from "@raycast/api";
import { useEffect } from "react";
import { ChangePromptProp, Prompt } from "../../type";

export const PromptDropdown = (props: ChangePromptProp) => {
  const { prompts, onPromptChange, selectedPrompt } = props;

  // it should same as `DropDown.storeValue`
  useEffect(() => {
    (async () => {
      const selectedPromptId = await LocalStorage.getItem<string>("select_prompt");
      if (!!selectedPromptId) {
        let selectedPrompt = prompts.find((prompt) => prompt.id == selectedPromptId);
        if (!!selectedPrompt) {
          onPromptChange(selectedPrompt as Prompt);
        }
      }
    })();
  }, [onPromptChange]);

  useEffect(() => {
    (async () => {
      if (!!selectedPrompt) {
        await LocalStorage.setItem("select_prompt", selectedPrompt.id);
      }
    })();
  }, [selectedPrompt]);

  /**
   * fix https://github.com/raycast/extensions/issues/10391#issuecomment-19131903
   *
   * we can't use `DropDown.storeValue`, because it will reset `selectedPrompt` to default when the component rerender.
   */
  return (
    <List.Dropdown
      tooltip="Select Prompt"
      value={selectedPrompt.id}
      onChange={(selectedPromptId) => {
        let selectedPrompt = prompts.find((prompt) => prompt.id == selectedPromptId);
        if (!!selectedPrompt) {
          onPromptChange(selectedPrompt as Prompt);
        }
      }}
    >
      {prompts.map((prompt) => (
        <List.Dropdown.Item
          key={prompt.id}
          title={prompt.name}
          value={prompt.id}
          keywords={[prompt.apiEndpointName, prompt.option, prompt.name]}
        />
      ))}
    </List.Dropdown>
  );
};
