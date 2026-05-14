import type { PromptSetId } from "../types";
import { ConfigurationRequired } from "./ConfigurationRequired";
import { PromptFileList } from "./PromptFileList";
import { getConfiguredPromptSetConfig, getPromptSetConfig } from "../services/preferences";

type Props = {
  promptSetId: PromptSetId;
};

export function PromptSetCommand({ promptSetId }: Props) {
  const configuredPromptSet = getConfiguredPromptSetConfig(promptSetId);
  const promptSet = configuredPromptSet ?? getPromptSetConfig(promptSetId);

  if (!promptSet.isEnabled) {
    return (
      <ConfigurationRequired
        title={promptSet.commandTitle}
        message={`Enable Prompt Set ${promptSetId} in Raycast Extension Preferences.`}
      />
    );
  }

  if (!configuredPromptSet) {
    return (
      <ConfigurationRequired
        title={promptSet.commandTitle}
        message={`Set Prompt Set ${promptSetId} Folder in Raycast Extension Preferences.`}
      />
    );
  }

  return (
    <PromptFileList
      promptSets={[configuredPromptSet]}
      searchBarPlaceholder={`Search ${configuredPromptSet.displayName}`}
      emptyTitle={`No Markdown prompts found in ${configuredPromptSet.displayName}`}
    />
  );
}
