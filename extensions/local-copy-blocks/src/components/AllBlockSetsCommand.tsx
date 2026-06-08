import { ConfigurationRequired } from "./ConfigurationRequired";
import { BlockFileList } from "./BlockFileList";
import { getConfiguredBlockSetConfigs } from "../services/preferences";

export function AllBlockSetsCommand() {
  const blockSets = getConfiguredBlockSetConfigs();

  if (blockSets.length === 0) {
    return (
      <ConfigurationRequired
        title="All Block Sets"
        message="Enable at least one Block Set and set its folder in Raycast Extension Preferences."
      />
    );
  }

  return (
    <BlockFileList
      blockSets={blockSets}
      searchBarPlaceholder="Search all copy blocks"
      emptyTitle="No Markdown-backed text blocks found in enabled Block Sets"
    />
  );
}
