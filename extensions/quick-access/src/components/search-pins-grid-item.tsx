import React from "react";
import { Application, Grid } from "@raycast/api";
import { DirectoryType, DirectoryWithFileInfo, TypeDirectory } from "../types/types";
import { DirectoryTagTypes } from "../utils/constants";
import { parse } from "path";
import { directory2File, isImage } from "../utils/common-utils";
import { primaryAction } from "../types/preferences";
import { ActionSearchPins } from "./action-search-pins";
import { MutatePromise } from "@raycast/utils";

export function SearchPinsGridItem(props: {
  isPinnedDirectories: boolean;
  pinnedDirectories: DirectoryWithFileInfo[];
  directory: DirectoryWithFileInfo;
  directoryIndex: number;
  tag: string;
  frontmostApp: Application | undefined;
  mutate: MutatePromise<TypeDirectory[] | undefined, TypeDirectory[] | undefined>;
}) {
  const { isPinnedDirectories, pinnedDirectories, directory, directoryIndex, tag, frontmostApp, mutate } = props;
  return directory.directory.type === DirectoryType.FOLDER ? (
    <Grid.Section
      key={directory.directory.id + directoryIndex}
      title={directory.directory.name}
      subtitle={directory.files.length.toString()}
    >
      {directory.files.map(
        (fileValue, fileIndex) =>
          (tag === fileValue.type || !DirectoryTagTypes.includes(tag)) && (
            <Grid.Item
              id={JSON.stringify(fileValue)}
              key={fileValue.path + fileIndex}
              content={
                isImage(parse(fileValue.path).ext)
                  ? { value: { source: fileValue.path }, tooltip: fileValue.name }
                  : { value: { fileIcon: fileValue.path }, tooltip: fileValue.name }
              }
              title={fileValue.name}
              quickLook={{ path: fileValue.path, name: fileValue.name }}
              actions={
                <ActionSearchPins
                  isPinnedDirectories={isPinnedDirectories}
                  pinnedDirectories={pinnedDirectories}
                  frontmostApp={frontmostApp}
                  primaryAction={primaryAction}
                  directoryIndex={directoryIndex}
                  directory={directory}
                  file={fileValue}
                  showDetail={false}
                  mutate={mutate}
                  showDetailMutate={undefined}
                />
              }
            />
          ),
      )}
    </Grid.Section>
  ) : (
    <Grid.Section title={directory.directory.name} key={directory.directory.id + directoryIndex}>
      <Grid.Item
        id={JSON.stringify(directory2File(directory.directory))}
        key={directory.directory.id + directoryIndex}
        title={directory.directory.name}
        quickLook={{
          path: directory2File(directory.directory).path,
          name: directory2File(directory.directory).name,
        }}
        content={
          isImage(parse(directory.directory.path).ext)
            ? { source: directory.directory.path, tooltip: directory2File(directory.directory).name }
            : { fileIcon: directory.directory.path, tooltip: directory2File(directory.directory).name }
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
            showDetail={false}
            mutate={mutate}
            showDetailMutate={undefined}
          />
        }
      />
    </Grid.Section>
  );
}
