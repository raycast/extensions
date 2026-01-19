import { Action, ActionPanel, Icon, List, getSelectedFinderItems, useNavigation } from "@raycast/api";

import { EditID3Tags } from "@/components/edit-id3-tags-form";
import { parseError } from "@/utils/error";
import {
  FileGeneralMetadata,
  getDirData,
  getFileGeneralMetadata,
  getParentDir,
  getPreferences,
  normalizeFileName,
  normalizePathSegments,
} from "@/utils/files";
import { readID3Tags } from "@/utils/id3";
import { Tags } from "node-id3";
import { lstatSync } from "node:fs";
import { homedir } from "node:os";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";

export default function Command() {
  const { push } = useNavigation();
  const { musicDir, useFinderSelection } = getPreferences();

  const [isLoading, setIsLoading] = useState(true);
  const [actualDir, setActualDir] = useState(musicDir);
  const [searchText, setSearchText] = useState("");

  const files = useMemo(() => {
    return isLoading ? [] : getDirData(actualDir);
  }, [isLoading, actualDir]);

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchText.toLowerCase()));

  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [fileGeneralMetadata, setFileGeneralMetadata] = useState<FileGeneralMetadata>();
  const [fileAudioMetadata, setFileAudioMetadata] = useState<Tags>();

  const onSelectionChange = useCallback(
    (id: string | null) => {
      const foundFile = files.find((file) => String(file.id) === id);
      if (!foundFile) return;
      const path = `${foundFile.path}/${foundFile.name}`;

      const generalMetadata = getFileGeneralMetadata(path);
      setFileGeneralMetadata(generalMetadata);

      if (foundFile.isDir) {
        setFileAudioMetadata(undefined);
      } else {
        const tags = readID3Tags(path);
        setFileAudioMetadata(tags);
      }
    },
    [files],
  );

  const getSelectedItems = useCallback(async () => {
    try {
      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length) {
        const firstItemPath = selectedItems[0].path;
        const stats = lstatSync(firstItemPath);

        if (stats.isDirectory()) {
          setActualDir(firstItemPath);
        } else if (stats.isFile()) {
          push(<EditID3Tags file={firstItemPath} />);
        }

        return;
      }
    } catch (error) {
      console.error("Error handling selected Finder items:", parseError(error));
    } finally {
      setIsLoading(false);
    }
  }, [push, setActualDir]);

  useEffect(() => {
    if (useFinderSelection) {
      getSelectedItems();
    } else {
      setIsLoading(false);
    }
  }, [getSelectedItems, useFinderSelection]);

  useEffect(() => {
    setSearchText("");
  }, [actualDir]);

  return (
    <List
      searchText={searchText}
      onSelectionChange={isLoading ? undefined : (id) => onSelectionChange(id)}
      onSearchTextChange={setSearchText}
      navigationTitle={normalizePathSegments(actualDir)}
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
    >
      {files.length || isLoading ? (
        filteredFiles.map((file, index) => {
          const fileIndex = filteredFiles.slice(0, index).filter((f) => !f.isDir).length + (file.isDir ? 0 : 1);

          return (
            <List.Item
              key={file.id}
              id={String(file.id)}
              icon={file.isDir ? Icon.Folder : Icon.Music}
              title={file.isDir ? normalizeFileName(file.name) : `${fileIndex}. ${normalizeFileName(file.name)}`}
              detail={
                <List.Item.Detail
                  isLoading={true}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="General Metadata" />
                      <List.Item.Detail.Metadata.Label title="Name" text={normalizeFileName(file.name)} />
                      {fileGeneralMetadata?.size && !file.isDir ? (
                        <List.Item.Detail.Metadata.Label title="Size" text={fileGeneralMetadata.size} />
                      ) : null}
                      {fileGeneralMetadata?.createdAt ? (
                        <List.Item.Detail.Metadata.Label title="Created At" text={fileGeneralMetadata.createdAt} />
                      ) : null}
                      {fileGeneralMetadata?.updatedAt ? (
                        <List.Item.Detail.Metadata.Label title="Updated At" text={fileGeneralMetadata.updatedAt} />
                      ) : null}

                      <List.Item.Detail.Metadata.Separator />

                      <List.Item.Detail.Metadata.Label title="Audio Metadata" />
                      {fileAudioMetadata?.title ? (
                        <List.Item.Detail.Metadata.Label title="Title" text={fileAudioMetadata.title} />
                      ) : null}
                      {fileAudioMetadata?.artist ? (
                        <List.Item.Detail.Metadata.Label title="Artist" text={fileAudioMetadata.artist} />
                      ) : null}
                      {fileAudioMetadata?.album ? (
                        <List.Item.Detail.Metadata.Label title="Album" text={fileAudioMetadata.album} />
                      ) : null}
                      {fileAudioMetadata?.performerInfo ? (
                        <List.Item.Detail.Metadata.Label
                          title="Album Artist"
                          text={fileAudioMetadata.performerInfo.split("/").join(", ")}
                        />
                      ) : null}
                      {fileAudioMetadata?.composer ? (
                        <List.Item.Detail.Metadata.Label title="Composer" text={fileAudioMetadata.composer} />
                      ) : null}
                      {fileAudioMetadata?.genre ? (
                        <List.Item.Detail.Metadata.Label title="Genre" text={fileAudioMetadata.genre} />
                      ) : null}
                      {fileAudioMetadata?.year && parseInt(fileAudioMetadata.year, 10) > 0 ? (
                        <List.Item.Detail.Metadata.Label title="Year" text={fileAudioMetadata.year} />
                      ) : null}
                      {fileAudioMetadata?.trackNumber ? (
                        <List.Item.Detail.Metadata.Label
                          title="Track Number"
                          text={
                            fileAudioMetadata.trackNumber.split("/").length > 1
                              ? `${fileAudioMetadata.trackNumber.split("/")[0]} of ${fileAudioMetadata.trackNumber.split("/")[1]}`
                              : fileAudioMetadata.trackNumber
                          }
                        />
                      ) : null}
                      {fileAudioMetadata?.partOfSet ? (
                        <List.Item.Detail.Metadata.Label
                          title="Disc Number"
                          text={
                            fileAudioMetadata.partOfSet.split("/").length > 1
                              ? `${fileAudioMetadata.partOfSet.split("/")[0]} of ${fileAudioMetadata.partOfSet.split("/")[1]}`
                              : fileAudioMetadata.partOfSet
                          }
                        />
                      ) : null}
                      {fileAudioMetadata?.comment ? (
                        <List.Item.Detail.Metadata.Label title="Comment" text={fileAudioMetadata.comment?.text} />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {!file.isDir ? (
                    <ActionPanel.Section>
                      <Action.Push
                        title="Edit Tags"
                        icon={Icon.Pencil}
                        target={<EditID3Tags file={`${file.path}/${file.name}`} />}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                    </ActionPanel.Section>
                  ) : null}
                  <ActionPanel.Section>
                    {file.isDir ? (
                      <Action
                        title="Open Directory"
                        icon={Icon.Folder}
                        onAction={() => setActualDir(`${file.path}/${file.name}`)}
                        shortcut={{ modifiers: [], key: "arrowRight" }}
                      />
                    ) : null}
                    {actualDir !== homedir() ? (
                      <OpenParentDirAction path={file.path} setActualDir={setActualDir} />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Toggle Detail View"
                      icon={Icon.AppWindowSidebarLeft}
                      onAction={() => setIsShowingDetail((prev) => !prev)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.Item
          title="No audio files found"
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              {actualDir !== homedir() ? <OpenParentDirAction path={actualDir} setActualDir={setActualDir} /> : null}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

interface OpenParentDirActionProps {
  path: string;
  setActualDir: Dispatch<SetStateAction<string>>;
}

function OpenParentDirAction({ path, setActualDir }: OpenParentDirActionProps) {
  return (
    <Action
      title="Open Parent Directory"
      icon={Icon.Folder}
      onAction={() => setActualDir(getParentDir(path))}
      shortcut={{ modifiers: [], key: "arrowLeft" }}
    />
  );
}
