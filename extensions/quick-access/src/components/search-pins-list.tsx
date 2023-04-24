import React, { useState } from "react";
import { getPreferenceValues, List } from "@raycast/api";
import { DirectoryType, FileInfo, FileType, Layout } from "../types/types";
import { Preferences } from "../types/preferences";
import { copyLatestFile, getFileInfoAndPreview, getIsShowDetail, localDirectoryWithFiles } from "../hooks/hooks";
import { tagDirectoryTypes } from "../utils/constants";
import { QuickAccessEmptyView } from "./quick-access-empty-view";
import { parse } from "path";
import { directory2File, isImage } from "../utils/common-utils";
import { ItemDetail } from "./item-detail";
import { ActionOnPins } from "./action-on-pins";

export function SearchPinsList() {
  const { primaryAction, rememberTag, autoCopyLatestFile, showOpenFolders } = getPreferenceValues<Preferences>();
  const [tag, setTag] = useState<string>("All");
  const [refresh, setRefresh] = useState<number>(0);
  const [filePath, setFilePath] = useState<FileInfo>({
    id: "",
    name: "",
    path: "",
    type: FileType.FILE,
    modifyTime: 0,
  });
  const [refreshDetail, setRefreshDetail] = useState<number>(0);

  const showDetail = getIsShowDetail(refreshDetail);
  const { directoryWithFiles, allFilesNumber, loading } = localDirectoryWithFiles(refresh, showOpenFolders);
  const { fileContentInfo, isDetailLoading } = getFileInfoAndPreview(filePath);

  //preference: copy the latest file
  copyLatestFile(autoCopyLatestFile, directoryWithFiles);

  return (
    <List
      isLoading={loading}
      isShowingDetail={showDetail && allFilesNumber !== 0}
      searchBarPlaceholder={"Search files"}
      onSelectionChange={(id) => {
        if (typeof id === "string") {
          setFilePath(JSON.parse(id));
        }
      }}
      searchBarAccessory={
        directoryWithFiles.length !== 0 ? (
          <List.Dropdown onChange={setTag} tooltip={"File type"} storeValue={rememberTag}>
            <List.Dropdown.Item key={"All"} title={"All"} value={"All"} />
            <List.Dropdown.Section title={"File"}>
              {directoryWithFiles.map((value, index) => {
                return (
                  <List.Dropdown.Item
                    key={index + value.directory.name}
                    title={value.directory.name}
                    value={value.directory.name}
                  />
                );
              })}
            </List.Dropdown.Section>
            <List.Dropdown.Section title={"Type"}>
              {tagDirectoryTypes.map((directoryType, index) => {
                return <List.Dropdown.Item key={index + directoryType} title={directoryType} value={directoryType} />;
              })}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : null
      }
    >
      <QuickAccessEmptyView
        layout={Layout.LIST}
        title={directoryWithFiles.length === 0 ? "Please pin first" : "No files"}
        description={directoryWithFiles.length === 0 ? "You can pin files or folders from the Action Panel" : ""}
        setRefresh={setRefresh}
        directoryWithFiles={directoryWithFiles}
      />
      {directoryWithFiles.map(
        (directory, directoryIndex) =>
          (tag == directory.directory.name || tag == "All" || tagDirectoryTypes.includes(tag)) &&
          (directory.directory.type === DirectoryType.FOLDER ? (
            <List.Section
              key={directory.directory.id + directoryIndex}
              title={directory.directory.name}
              subtitle={directory.files.length + (showDetail ? "" : "    " + parse(directory.directory.path).dir)}
            >
              {directory.files.map(
                (fileValue, fileIndex) =>
                  (tag === fileValue.type || !tagDirectoryTypes.includes(tag)) && (
                    <List.Item
                      id={JSON.stringify(fileValue)}
                      key={fileValue.path + fileIndex}
                      icon={
                        isImage(parse(fileValue.path).ext) ? { source: fileValue.path } : { fileIcon: fileValue.path }
                      }
                      title={fileValue.name}
                      quickLook={{ path: fileValue.path, name: fileValue.name }}
                      detail={<ItemDetail isDetailLoading={isDetailLoading} fileContentInfo={fileContentInfo} />}
                      actions={
                        <ActionOnPins
                          primaryAction={primaryAction}
                          directoryIndex={directoryIndex}
                          directory={directory}
                          file={fileValue}
                          showDetail={showDetail}
                          setRefresh={setRefresh}
                          setRefreshDetail={setRefreshDetail}
                        />
                      }
                    />
                  )
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
                detail={<ItemDetail isDetailLoading={isDetailLoading} fileContentInfo={fileContentInfo} />}
                icon={
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
                    showDetail={showDetail}
                    setRefresh={setRefresh}
                    setRefreshDetail={setRefreshDetail}
                  />
                }
              />
            </List.Section>
          ))
      )}
    </List>
  );
}
