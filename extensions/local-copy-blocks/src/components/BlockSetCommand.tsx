import type { BlockSetId } from "../types";
import { ConfigurationRequired } from "./ConfigurationRequired";
import { BlockFileList } from "./BlockFileList";
import { getConfiguredBlockSetConfig, getBlockSetConfig } from "../services/preferences";

type Props = {
  blockSetId: BlockSetId;
};

export function BlockSetCommand({ blockSetId }: Props) {
  const configuredBlockSet = getConfiguredBlockSetConfig(blockSetId);
  const blockSet = configuredBlockSet ?? getBlockSetConfig(blockSetId);

  if (!blockSet.isEnabled) {
    return (
      <ConfigurationRequired
        title={blockSet.commandTitle}
        message={`Enable Block Set ${blockSetId} in Raycast Extension Preferences.`}
      />
    );
  }

  if (!configuredBlockSet) {
    return (
      <ConfigurationRequired
        title={blockSet.commandTitle}
        message={`Set Block Set ${blockSetId} Folder in Raycast Extension Preferences.`}
      />
    );
  }

  return (
    <BlockFileList
      blockSets={[configuredBlockSet]}
      searchBarPlaceholder={`Search ${configuredBlockSet.displayName}`}
      emptyTitle={`No Markdown-backed text blocks found in ${configuredBlockSet.displayName}`}
    />
  );
}
