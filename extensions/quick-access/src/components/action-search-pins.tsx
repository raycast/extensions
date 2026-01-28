import { ActionPanel, Application } from "@raycast/api";
import React from "react";
import { ActionsOnFiles } from "./action-on-files";
import { DirectoryWithFileInfo, FileInfo, TypeDirectory } from "../types/types";
import { ActionConfigureCommand } from "./action-configure-command";
import { MutatePromise } from "@raycast/utils";
import { ActionOnPins } from "./action-on-pins";
import { ActionOnDetail } from "./action-on-detail";

export function ActionSearchPins(props: {
  isPinnedDirectories: boolean;
  pinnedDirectories: DirectoryWithFileInfo[];
  frontmostApp: Application | undefined;
  primaryAction: string;
  directoryIndex: number;
  directory: DirectoryWithFileInfo;
  file: FileInfo;
  showDetail: boolean;
  mutate: MutatePromise<TypeDirectory[] | undefined, TypeDirectory[] | undefined>;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined> | undefined;
}) {
  const {
    isPinnedDirectories,
    pinnedDirectories,
    frontmostApp,
    primaryAction,
    directoryIndex,
    directory,
    file,
    showDetail,
    mutate,
    showDetailMutate,
  } = props;
  return (
    <ActionPanel>
      <ActionsOnFiles
        frontmostApp={frontmostApp}
        isTopFolder={true}
        primaryAction={primaryAction}
        name={file.name}
        path={file.path}
        mutate={mutate}
      />
      {isPinnedDirectories && (
        <ActionPanel.Section>
          <ActionOnPins
            pinnedDirectories={pinnedDirectories}
            directoryIndex={directoryIndex}
            directory={directory}
            mutate={mutate}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <ActionOnDetail showDetail={showDetail} showDetailMutate={showDetailMutate} />
      </ActionPanel.Section>

      <ActionConfigureCommand />
    </ActionPanel>
  );
}
