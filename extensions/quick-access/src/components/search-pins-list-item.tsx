import React from "react";
import { Application, List } from "@raycast/api";
import { DirectoryType, DirectoryWithFileInfo, TypeDirectory } from "../types/types";
import { DirectoryTagTypes } from "../utils/constants";
import { parse } from "path";
import { directory2File, isImage } from "../utils/common-utils";
import { primaryAction } from "../types/preferences";
import { ActionSearchPins } from "./action-search-pins";
import { MutatePromise } from "@raycast/utils";
import { ItemDetail } from "./item-detail";
import { FileContentInfo } from "../types/file-content-info";

export function SearchPinsListItem(props: {
  isPinnedDirectories: boolean;
  pinnedDirectories: DirectoryWithFileInfo[];
  directory: DirectoryWithFileInfo;
  directoryIndex: number;
  tag: string;
  frontmostApp: Application | undefined;
  mutate: MutatePromise<TypeDirectory[] | undefined, TypeDirectory[] | undefined>;
  showDetail: boolean;
  filePreviewLoading: boolean;
  filePreview: FileContentInfo;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined> | undefined;
}) {
  const {
    isPinnedDirectories,
    pinnedDirectories,
    directory,
    directoryIndex,
    tag,
    frontmostApp,
    mutate,
    showDetail,
    filePreviewLoading,
    filePreview,
    showDetailMutate,
  } = props;
  return directory.directory.type === DirectoryType.FOLDER ? (
    <List.Section
      key={directory.directory.id + directoryIndex}
      title={directory.directory.name}
      subtitle={directory.files.length + (showDetail ? "" : "    " + parse(directory.directory.path).dir)}
    >
      {directory.files.map(
        (fileValue, fileIndex) =>
          (tag === fileValue.type || !DirectoryTagTypes.includes(tag)) && (
            <List.Item
              id={JSON.stringify(fileValue)}
              key={fileValue.path + fileIndex}
              icon={isImage(parse(fileValue.path).ext) ? { source: fileValue.path } : { fileIcon: fileValue.path }}
              title={fileValue.name}
              quickLook={{ path: fileValue.path, name: fileValue.name }}
              detail={<ItemDetail isDetailLoading={filePreviewLoading} fileContentInfo={filePreview} />}
              actions={
                <ActionSearchPins
                  isPinnedDirectories={isPinnedDirectories}
                  pinnedDirectories={pinnedDirectories}
                  frontmostApp={frontmostApp}
                  primaryAction={primaryAction}
                  directoryIndex={directoryIndex}
                  directory={directory}
                  file={fileValue}
                  showDetail={showDetail}
                  mutate={mutate}
                  showDetailMutate={showDetailMutate}
                />
              }
            />
          ),
      )}
    </List.Section>
  ) : (
    <List.Section title={directory.directory.name} key={directory.directory.id + directoryIndex}>
      <List.Item
        id={JSON.stringify(directory2File(directory.directory))}
        key={directory.directory.id + directoryIndex}
        title={directory.directory.name}
        quickLook={{
          path: directory2File(directory.directory).path,
          name: directory2File(directory.directory).name,
        }}
        detail={<ItemDetail isDetailLoading={filePreviewLoading} fileContentInfo={filePreview} />}
        icon={
          isImage(parse(directory.directory.path).ext)
            ? { source: directory.directory.path }
            : { fileIcon: directory.directory.path }
        }
        actions={
          <ActionSearchPins
            isPinnedDirectories={isPinnedDirectories}
            pinnedDirectories={pinnedDirectories}
            frontmostApp={frontmostApp}
            primaryAction={primaryAction}
            directoryIndex={directoryIndex}
            directory={directory}
            file={directory2File(directory.directory)}
            showDetail={showDetail}
            mutate={mutate}
            showDetailMutate={showDetailMutate}
          />
        }
      />
    </List.Section>
  );
}
