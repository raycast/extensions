import { getPreferenceValues, List, LocalStorage } from "@raycast/api";
import React, { useState } from "react";
import { directory2File, getLocalStorage, isEmpty, isImage } from "./utils/common-utils";
import { DirectoryInfo, DirectoryType, FileInfo, FileType } from "./types/types";
import { parse } from "path";
import { LocalStorageKey, tagDirectoryTypes } from "./utils/constants";
import {
  copyLatestFile,
  getFileInfoAndPreview,
  getIsShowDetail,
  localDirectoryWithFiles,
  refreshNumber,
} from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { QuickAccessEmptyView } from "./components/quick-access-empty-view";
import { ItemDetail } from "./components/item-detail";
import { ActionOnPins } from "./components/action-on-pins";

export default function SearchPins() {
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
            <List.Item
              id={JSON.stringify(directory2File(directory.directory))}
              key={directory.directory.id + directoryIndex}
              title={directory.directory.name}
              quickLook={{
                path: directory2File(directory.directory).path,
                name: directory2File(directory.directory).name,
              }}
              detail={<ItemDetail isDetailLoading={isDetailLoading} fileContentInfo={fileContentInfo} />}
              icon={{ fileIcon: directory.directory.path }}
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
          ))
      )}
    </List>
  );
}

export async function upRank(index: number, setRefresh: React.Dispatch<React.SetStateAction<number>>) {
  const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
  const directories: DirectoryInfo[] = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);
  const moreHighRank = directories.filter((value) => {
    return value.path !== directories[index].path && value.rank >= directories[index].rank;
  });
  if (moreHighRank.length !== 0) {
    let allRank = 0;
    directories.forEach((value) => [(allRank = allRank + value.rank)]);
    directories[index].rank = Math.floor((directories[index].rank + 1 - directories[index].rank / allRank) * 100) / 100;
  }
  directories.sort(function (a, b) {
    return b.rank - a.rank;
  });

  await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(directories));
  setRefresh(refreshNumber());
}
