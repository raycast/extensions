import { useEffect, useMemo, useState } from "react";
import { ActionPanel, List, Action, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fs, { readdirSync, statSync, PathLike, existsSync, accessSync } from "fs";
import { join, basename, dirname, resolve, extname } from "path";
import { homedir, tmpdir } from "os";
import fuzzysort from "fuzzysort";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

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

const escapePath = (path: PathLike): string => path.toLocaleString().replace(/([^0-9a-z_\-.~/])/gi, "\\$1");

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
    .map((file) => {
      const fileStats = statSync(file);

      return {
        name: basename(file),
        path: file,
        displayPath: displayPath(file),
        fileSizeFormatted: formatBytes(fileStats.size),
        createdAt: fileStats.birthtime,
        updatedAt: fileStats.mtime,
      };
    });

const isPathReadable = (path: PathLike): boolean => {
  try {
    accessSync(path, fs.constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
};

const getFilesRecursively = (path: PathLike, allowHidden: boolean): Record<string, FileInfo> => {
  const canReadPath = isPathReadable(path);
  const dirs = canReadPath ? getDirectories(path, allowHidden) : [];
  const files = dirs.map((dir) => getFilesRecursively(dir, allowHidden)).reduce((a, b) => ({ ...a, ...b }), {});

  return {
    ...files,
    ...(canReadPath ? getFiles(path, allowHidden) : []).reduce(
      (acc, file) => ({ ...acc, [file.displayPath]: file }),
      {}
    ),
  };
};

const NON_PREVIEWABLE_EXTENSIONS = [
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",
  ".xz",
  ".iso",
  ".dmg",
  ".exe",
  ".DS_Store",
  ".app",
  ".gdoc",
  ".gsheet",
  ".gslides",
];

const filePreviewPath = async (file: FileInfo): Promise<null | string> => {
  const outputDir = tmpdir();

  if (NON_PREVIEWABLE_EXTENSIONS.includes(extname(file.path).toLowerCase())) {
    return null;
  }

  try {
    await execAsync(`qlmanage -t -s 256 ${escapePath(file.path)} -o ${outputDir}`, {
      timeout: 500 /* milliseconds */,
      killSignal: "SIGKILL",
    });
  } catch (e) {
    return null;
  }

  return encodeURI(`file://${outputDir}/${file.name}.png`);
};

const fileMetadataMarkdown = async (file: FileInfo | null): Promise<string> => {
  if (!file) {
    return "";
  }

  const previewPath = await filePreviewPath(file);
  const previewExists = previewPath && existsSync(decodeURI(previewPath).replace("file://", ""));
  const previewImage = previewExists ? `<img src="${previewPath}" alt="${file.name}" height="200" />` : "";

  return `
${previewImage}

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
${file.updatedAt.toLocaleString()}`;
};

type Preferences = {
  shouldShowHiddenFiles: boolean;
  googleDriveRootPath: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const drivePath = resolve(preferences.googleDriveRootPath.trim().replace("~", homedir()));
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileDetailsMarkup, setFileDetailsMarkup] = useState<string>("");

  useEffect(() => {
    (async () => setFileDetailsMarkup(await fileMetadataMarkdown(selectedFile)))();
  }, [selectedFile]);

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
      if (searchText.trim().length === 0 || Object.keys(filesMap).length === 0) {
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
          .map((result) => filesMap[result.target])
          .filter((file) => file)
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
      onSelectionChange={(id) => setSelectedFile((id && filesMap[id]) || null)}
    >
      {filesFiltered.length > 0 ? (
        <List.Section title="Files">
          {filesFiltered.map((file) => (
            <List.Item
              id={file.displayPath}
              key={file.displayPath}
              icon={{ fileIcon: file.path }}
              title={file.name}
              detail={<List.Item.Detail markdown={fileDetailsMarkup} />}
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
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No files found" />
      )}
    </List>
  );
}
