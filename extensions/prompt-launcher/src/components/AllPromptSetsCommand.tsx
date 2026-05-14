import { ConfigurationRequired } from "./ConfigurationRequired";
import { PromptFileList } from "./PromptFileList";
import { getConfiguredPromptSetConfigs } from "../services/preferences";

export function AllPromptSetsCommand() {
  const promptSets = getConfiguredPromptSetConfigs();

  if (promptSets.length === 0) {
    return (
      <ConfigurationRequired
        title="All Prompt Sets"
        message="Enable at least one Prompt Set and set its folder in Raycast Extension Preferences."
      />
    );
  }

  return (
    <PromptFileList
      promptSets={promptSets}
      searchBarPlaceholder="Search all prompts"
      emptyTitle="No Markdown prompts found in enabled prompt sets"
    />
  );
}
