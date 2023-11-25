import React, { useState } from "react";
import { getPreferenceValues, Grid } from "@raycast/api";
import { DirectoryType, Layout } from "../types/types";
import { Preferences } from "../types/preferences";
import { copyLatestFile, localDirectoryWithFiles } from "../hooks/hooks";
import { tagDirectoryTypes } from "../utils/constants";
import { QuickAccessEmptyView } from "./quick-access-empty-view";
import { parse } from "path";
import { directory2File, isImage } from "../utils/common-utils";
import { ActionOnPins } from "./action-on-pins";

export function SearchPinsGrid() {
  const { columns, itemInset, primaryAction, rememberTag, autoCopyLatestFile, showOpenFolders } =
    getPreferenceValues<Preferences>();
  const [tag, setTag] = useState<string>("All");
  const [refresh, setRefresh] = useState<number>(0);

  const { directoryWithFiles, loading } = localDirectoryWithFiles(refresh, showOpenFolders);

  //preference: copy the latest file
  copyLatestFile(autoCopyLatestFile, directoryWithFiles);

  return (
    <Grid
      isLoading={loading}
      columns={parseInt(columns)}
      aspectRatio={"1"}
      inset={itemInset as Grid.Inset}
      fit={Grid.Fit.Contain}
      searchBarPlaceholder={"Search files"}
      searchBarAccessory={
        directoryWithFiles.length !== 0 ? (
          <Grid.Dropdown onChange={setTag} tooltip={"File type"} storeValue={rememberTag}>
            <Grid.Dropdown.Item key={"All"} title={"All"} value={"All"} />
            <Grid.Dropdown.Section title={"File"}>
              {directoryWithFiles.map((value, index) => {
                return (
                  <Grid.Dropdown.Item
                    key={index + value.directory.name}
                    title={value.directory.name}
                    value={value.directory.name}
                  />
                );
              })}
            </Grid.Dropdown.Section>
            <Grid.Dropdown.Section title={"Type"}>
              {tagDirectoryTypes.map((directoryType, index) => {
                return <Grid.Dropdown.Item key={index + directoryType} title={directoryType} value={directoryType} />;
              })}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        ) : null
      }
    >
      <QuickAccessEmptyView
        layout={Layout.GRID}
        title={directoryWithFiles.length === 0 ? "Please pin first" : "No files"}
        description={directoryWithFiles.length === 0 ? "You can pin files or folders from the Action Panel" : ""}
        setRefresh={setRefresh}
        directoryWithFiles={directoryWithFiles}
      />
      {directoryWithFiles.map(
        (directory, directoryIndex) =>
          (tag == directory.directory.name || tag == "All" || tagDirectoryTypes.includes(tag)) &&
          (directory.directory.type === DirectoryType.FOLDER ? (
            <Grid.Section
              key={directory.directory.id + directoryIndex}
              title={directory.directory.name}
              subtitle={directory.files.length.toString()}
            >
              {directory.files.map(
                (fileValue, fileIndex) =>
                  (tag === fileValue.type || !tagDirectoryTypes.includes(tag)) && (
                    <Grid.Item
                      id={JSON.stringify(fileValue)}
                      key={fileValue.path + fileIndex}
                      content={
                        isImage(parse(fileValue.path).ext) ? { source: fileValue.path } : { fileIcon: fileValue.path }
                      }
                      title={fileValue.name}
                      quickLook={{ path: fileValue.path, name: fileValue.name }}
                      actions={
                        <ActionOnPins
                          primaryAction={primaryAction}
                          directoryIndex={directoryIndex}
                          directory={directory}
                          file={fileValue}
                          showDetail={false}
                          setRefresh={setRefresh}
                          setRefreshDetail={undefined}
                        />
                      }
                    />
                  )
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
                    ? { source: directory.directory.path }
                    : { fileIcon: directory.directory.path }
                }
                actions={
                  <ActionOnPins
                    primaryAction={primaryAction}
                    directoryIndex={directoryIndex}
                    directory={directory}
                    file={directory2File(directory.directory)}
                    showDetail={false}
                    setRefresh={setRefresh}
                    setRefreshDetail={undefined}
                  />
                }
              />
            </Grid.Section>
          ))
      )}
    </Grid>
  );
}
