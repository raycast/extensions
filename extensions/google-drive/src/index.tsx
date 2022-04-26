import { useEffect, useMemo, useState } from "react";
import { ActionPanel, List, Action, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { readdirSync, statSync, PathLike, existsSync } from "fs";
import { join, basename, dirname, resolve } from "path";
import { homedir } from "os";
import fuzzysort from "fuzzysort";

const isDirectory = (path: PathLike) => statSync(path).isDirectory();

const isHidden = (path: PathLike) => basename(path.toLocaleString()).startsWith(".");

const getDirectories = (path: PathLike, allowHidden: boolean): Array<PathLike> =>
  readdirSync(path, "utf8")
    .map((name) => join(path.toLocaleString(), name))
    .filter(isDirectory)
    .filter((path) => allowHidden || !isHidden(path));

const isFile = (path: PathLike) => statSync(path).isFile();

const formatBytes = (sizeInBytes: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  while (sizeInBytes >= 1024) {
    sizeInBytes /= 1024;
    unitIndex++;
  }

  return `${sizeInBytes.toFixed(1)} ${units[unitIndex]}`;
};

const displayPath = (path: PathLike): string => path.toLocaleString().replace(homedir(), "~");

const escapePath = (path: PathLike): string => path.toLocaleString().replace(/\s/g, "\\ ");

type FileInfo = {
  name: string;
  path: string;
  displayPath: string;
  fileSizeFormatted: string;
  createdAt: Date;
  updatedAt: Date;
};
const getFiles = (path: PathLike, allowHidden: boolean): Array<FileInfo> =>
  readdirSync(path)
    .map((name) => join(path.toLocaleString(), name))
    .filter(isFile)
    .filter((file) => allowHidden || !isHidden(file))
    .map((file) => ({
      name: basename(file),
      path: file,
      displayPath: displayPath(file),
      fileSizeFormatted: formatBytes(statSync(file).size),
      createdAt: statSync(file).birthtime,
      updatedAt: statSync(file).mtime,
    }));

const getFilesRecursively = (path: PathLike, allowHidden: boolean): Record<string, FileInfo> => {
  const dirs = getDirectories(path, allowHidden);
  const files = dirs.map((dir) => getFilesRecursively(dir, allowHidden)).reduce((a, b) => ({ ...a, ...b }), {});

  return {
    ...files,
    ...getFiles(path, allowHidden).reduce((acc, file) => ({ ...acc, [file.displayPath]: file }), {}),
  };
};

const fileMetadataMarkdown = (file: FileInfo) => `
## File Information

**Name**\n
${file.name}

---

**Path**\n
\`${file.displayPath}\`

---

**Size**\n
${file.fileSizeFormatted}

---

**Created**\n
${file.createdAt.toLocaleString()}

---

**Updated**\n
${file.updatedAt.toLocaleString()}
`;

type Preferences = {
  shouldShowHiddenFiles: boolean;
  googleDriveRootPath: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const drivePath = resolve(preferences.googleDriveRootPath.trim().replace("~", homedir()));

  const filesMap = useMemo<Record<string, FileInfo>>(() => {
    try {
      if (!existsSync(drivePath)) {
        showToast({
          style: Toast.Style.Failure,
          title: `The specified Google Drive root path "${drivePath}" does not exist.`,
        });
        return {};
      }

      return getFilesRecursively(drivePath, preferences.shouldShowHiddenFiles);
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error! Is Google Drive app running and accessible?",
        message: `Could not read files in "${displayPath(drivePath)}"`,
      });
    }

    return {};
  }, [drivePath, preferences.shouldShowHiddenFiles]);
  const originalFilteredAndSortedFiles = useMemo<Array<FileInfo>>(
    () => Object.values(filesMap).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [filesMap]
  );
  const [searchText, setSearchText] = useState("");
  const [filesFiltered, setFilesFiltered] = useState<Array<FileInfo>>(originalFilteredAndSortedFiles);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    (async () => {
      if (searchText.length === 0 || Object.keys(filesMap).length === 0) {
        setFilesFiltered(originalFilteredAndSortedFiles);
        return;
      }

      setIsFiltering(true);

      const fuzzySortResults = await fuzzysort.goAsync(
        searchText,
        Object.keys(filesMap).map((filePath) => fuzzysort.prepare(filePath)),
        { limit: 100, threshold: -10000 }
      );

      setFilesFiltered(
        (_prevFiles) =>
          fuzzySortResults
            .map((result) => result)
            .sort((a, b) => {
              if (a.score < b.score) {
                return 1;
              } else if (a.score > b.score) {
                return -1;
              } else if (filesMap[a.target] && filesMap[b.target]) {
                return filesMap[b.target].updatedAt.getTime() - filesMap[a.target].updatedAt.getTime();
              } else {
                return 0;
              }
            })
            .map((rating) => filesMap[rating.target])
            .filter((file) => file) as FileInfo[]
      );

      setIsFiltering(false);
    })();
  }, [searchText, filesMap]);

  return (
    <List
      isShowingDetail={filesFiltered.length > 0}
      throttle
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder={`Search in ${displayPath(drivePath)}`}
      isLoading={isFiltering}
    >
      {filesFiltered.length > 0 ? (
        <List.Section title="Files">
          {filesFiltered.map((file) => (
            <FileItem key={file.path} file={file} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No files found" />
      )}
    </List>
  );
}

type FileItemProps = { file: FileInfo };
function FileItem({ file }: FileItemProps): JSX.Element {
  return (
    <List.Item
      id={file.path}
      icon={{ fileIcon: file.path }}
      title={file.name}
      detail={<List.Item.Detail markdown={fileMetadataMarkdown(file)} />}
      actions={
        <ActionPanel>
          <Action.Open title="Open File" icon={Icon.Document} target={file.path} />
          <Action.ShowInFinder path={file.path} />
          <Action.OpenWith path={file.path} />
          <Action.CopyToClipboard
            title="Copy File Path"
            content={escapePath(file.displayPath)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action.CopyToClipboard
            title="Copy Folder Path"
            content={escapePath(dirname(file.displayPath))}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
        </ActionPanel>
      }
    />
  );
}
