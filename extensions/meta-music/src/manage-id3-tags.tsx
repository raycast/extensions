import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { EditID3Tags } from "@/components/edit-id3-tags";
import { FileGeneralMetadata, getDirData, getFileGeneralMetadata, getMusicDir, getParentDir } from "@/utils/files";
import { readID3Tags } from "@/utils/id3";
import { Tags } from "node-id3";
import { homedir } from "node:os";
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

export default function Command() {
  const musicDir = getMusicDir();
  const [actualDir, setActualDir] = useState(musicDir);
  const [searchText, setSearchText] = useState("");

  const files = getDirData(actualDir);
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

  useEffect(() => {
    setSearchText("");
  }, [actualDir]);

  return (
    <List
      searchText={searchText}
      onSelectionChange={(id) => onSelectionChange(id)}
      onSearchTextChange={setSearchText}
      navigationTitle={actualDir}
      isShowingDetail={isShowingDetail}
    >
      {files.length ? (
        filteredFiles.map((file, index) => (
          <List.Item
            key={file.id}
            id={String(file.id)}
            icon={file.isDir ? Icon.Folder : Icon.Music}
            title={`${index + 1}. ${file.name}`}
            detail={
              <List.Item.Detail
                isLoading={true}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="General Metadata" />
                    <List.Item.Detail.Metadata.Label title="Name" text={file.name} />
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
        ))
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
