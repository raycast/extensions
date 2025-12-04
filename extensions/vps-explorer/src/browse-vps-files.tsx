import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  PopToRootType,
  showHUD,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { join } from "path";
import { homedir } from "os";
import { useEffect, useMemo, useState } from "react";
import { FileItem, SortTypes, VPSConnectionData } from "../types";
import { VPSOperations } from "../services/vpsOperations";
import prettyBytes from "pretty-bytes";
import { arrowLeftLightIcon, emptyfolderLightIcon } from "../lib/constants";
import { getfileLightIcon, getItemMarkdown, sortFiles, getUniqueFilename } from "../lib/utils";
import NewDirectory from "./components/new-directory";
import UploadFile from "./components/upload-file";
import RenameFile from "./components/rename-file";

const MainDirectoryItem = ({ onGoToParentDirectory }: { onGoToParentDirectory: () => void }) => {
  return (
    <List.Item
      title=".."
      icon={Icon.Folder}
      actions={
        <ActionPanel>
          <Action title="Go to Parent Directory" icon={Icon.Folder} onAction={onGoToParentDirectory} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={getItemMarkdown("..", "directory")}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text="Parent Directory" />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};

export default function Metadata() {
  const { push } = useNavigation();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("/root");
  const [isLoading, setIsLoading] = useState(true);
  const [vpsOperations, setVpsOperations] = useState<VPSOperations | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  const [sortBy, setSortby] = useState<SortTypes>(SortTypes.NAME);

  const sortedFiles = useMemo(() => {
    return sortFiles(files, sortBy);
  }, [files, sortBy]);

  const preferences = getPreferenceValues<Preferences>();

  const connectionConfig: VPSConnectionData = {
    host: preferences["vps-host"],
    port: Number(preferences["vps-port"]),
    username: preferences["vps-username"],
    password: preferences["vps-password"],
  };

  useEffect(() => {
    let mounted = true;

    const connectToVps = async () => {
      try {
        const client = new VPSOperations(connectionConfig);
        await client.connect(connectionConfig);

        if (!mounted) return;

        setVpsOperations(client);

        const currentFiles = await client.listFiles(currentPath);
        setFiles(currentFiles);
      } catch (error) {
        showToast({
          title: "Connection Failed",
          message: error instanceof Error ? error.message : "Unknown error",
          style: Toast.Style.Failure,
        });
        console.error(error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    connectToVps();

    return () => {
      mounted = false;
      vpsOperations?.disconnect();
    };
  }, []);

  const handleGoToDirectory = async (directory: string) => {
    setIsLoading(true);

    try {
      setNavigationHistory([...navigationHistory, currentPath]);
      setCurrentPath(directory);
      const currentFiles = await vpsOperations?.listFiles(directory);
      setFiles(currentFiles ?? []);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to list files";
      showToast({
        title: "Error",
        message: errorMsg,
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = async () => {
    const toast = await showToast({
      title: "Going back to",
      message: navigationHistory[navigationHistory.length - 1],
      style: Toast.Style.Animated,
    });

    if (navigationHistory.length === 0) {
      toast.hide();
      return;
    }
    const previousPath = navigationHistory[navigationHistory.length - 1];

    const newHistory = navigationHistory.slice(0, -1);
    setNavigationHistory(newHistory);

    setIsLoading(true);
    setCurrentPath(previousPath);

    vpsOperations
      ?.listFiles(previousPath)
      .then((currentFiles) => {
        setFiles(currentFiles ?? []);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        toast.hide();
        setIsLoading(false);
      });
  };

  const handleDisconnect = async () => {
    await vpsOperations?.disconnect();

    await showHUD("Disconnected from VPS successfully!", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  };

  const handleCreateDirectory = async (directoryName: string) => {
    setIsLoading(true);

    const toast = await showToast({
      title: "Creating directory",
      message: directoryName,
      style: Toast.Style.Animated,
    });

    try {
      await vpsOperations?.createDirectory(currentPath, directoryName);

      toast.style = Toast.Style.Success;
      toast.title = "Directory created";

      const currentFiles = await vpsOperations?.listFiles(currentPath);
      setFiles(currentFiles ?? []);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create directory";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowCreateDirectoryForm = () => {
    push(<NewDirectory onSubmit={handleCreateDirectory} />);
  };

  const handleRenameFile = async (filePath: string, currentName: string, newName: string) => {
    setIsLoading(true);

    const toast = await showToast({
      title: "Renaming...",
      message: `${currentName} → ${newName}`,
      style: Toast.Style.Animated,
    });

    try {
      await vpsOperations?.renameFile(filePath, newName);

      toast.style = Toast.Style.Success;
      toast.title = "Renamed successfully";

      const currentFiles = await vpsOperations?.listFiles(currentPath);
      setFiles(currentFiles ?? []);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to rename";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowRenameForm = (filePath: string, fileName: string, isFile: boolean) => {
    push(
      <RenameFile
        currentName={fileName}
        isFile={isFile}
        onSubmit={(newName) => handleRenameFile(filePath, fileName, newName)}
      />,
    );
  };

  const handleDeleteFile = async (filePath: string, fileName: string) => {
    const confirmed = await confirmAlert({
      title: "Delete File",
      message: `Are you sure you want to delete "${fileName}"?\n\nThis action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    setIsLoading(true);

    const toast = await showToast({
      title: "Deleting...",
      message: fileName,
      style: Toast.Style.Animated,
    });

    try {
      await vpsOperations?.deleteFile(filePath);

      toast.style = Toast.Style.Success;
      toast.title = "Deleted successfully";

      const currentFiles = await vpsOperations?.listFiles(currentPath);
      setFiles(currentFiles ?? []);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = async (remotePath: string, fileName: string) => {
    const downloadsDir = join(homedir(), "Downloads");

    const uniqueFileName = getUniqueFilename(downloadsDir, fileName);
    const localPath = join(downloadsDir, uniqueFileName);

    const wasRenamed = uniqueFileName !== fileName;

    const toast = await showToast({
      title: "Downloading...",
      message: wasRenamed ? `${fileName} → ${uniqueFileName}` : fileName,
      style: Toast.Style.Animated,
    });

    try {
      await vpsOperations?.downloadFile(remotePath, localPath);

      toast.style = Toast.Style.Success;
      toast.title = wasRenamed ? "Downloaded (renamed)" : "Downloaded successfully";
      toast.message = wasRenamed ? `Saved as: ${uniqueFileName}` : undefined;
      toast.primaryAction = {
        title: "Show in Finder",
        onAction: () => {
          showInFinder(localPath);
        },
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to download";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  // const handleShowDownloadForm = (remotePath: string, fileName: string) => {
  //   push(<DownloadTargetFolder onSubmit={() => handleDownloadFile(remotePath, fileName)} />);
  // };

  const handleUploadFile = async (localFilePath: string) => {
    const fileName = localFilePath.split("/").pop() || localFilePath;
    const remoteDestPath = join(currentPath, fileName);

    const fileExists = files.some((file) => file.name === fileName && file.path === remoteDestPath);

    if (fileExists) {
      const options = await confirmAlert({
        title: "File Already Exists",
        message: `"${fileName}" already exists in this directory. What would you like to do?`,
        primaryAction: {
          title: "Overwrite",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Keep Both",
          style: Alert.ActionStyle.Default,
        },
      });

      if (options === false) {
        const uniqueFileName = getUniqueRemoteFilename(fileName);
        const uniqueRemotePath = join(currentPath, uniqueFileName);

        await uploadFileToVPS(localFilePath, uniqueRemotePath, uniqueFileName, true);
        return;
      } else if (options === true) {
        await uploadFileToVPS(localFilePath, remoteDestPath, fileName, false);
        return;
      } else {
        return;
      }
    } else {
      await uploadFileToVPS(localFilePath, remoteDestPath, fileName, false);
    }
  };

  const getUniqueRemoteFilename = (filename: string): string => {
    const existingNames = files.map((f) => f.name);

    const lastDotIndex = filename.lastIndexOf(".");
    let name: string;
    let ext: string;

    if (lastDotIndex === -1 || lastDotIndex === 0) {
      name = filename;
      ext = "";
    } else {
      name = filename.substring(0, lastDotIndex);
      ext = filename.substring(lastDotIndex);
    }

    let counter = 1;
    let newFilename = `${name}(${counter})${ext}`;

    while (existingNames.includes(newFilename)) {
      counter++;
      newFilename = `${name}(${counter})${ext}`;
    }

    return newFilename;
  };

  const uploadFileToVPS = async (
    localFilePath: string,
    remotePath: string,
    displayName: string,
    wasRenamed: boolean,
  ) => {
    const toast = await showToast({
      title: "Uploading...",
      message: displayName,
      style: Toast.Style.Animated,
    });

    try {
      await vpsOperations?.uploadFile(remotePath, localFilePath);

      toast.style = Toast.Style.Success;
      toast.title = wasRenamed ? "Uploaded (renamed)" : "Uploaded successfully";
      toast.message = wasRenamed ? `Saved as: ${displayName}` : undefined;

      const currentFiles = await vpsOperations?.listFiles(currentPath);
      setFiles(currentFiles ?? []);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to upload";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleShowUploadForm = () => {
    push(<UploadFile onSubmit={handleUploadFile} />);
  };

  const Item = ({ file }: { file: FileItem }) => {
    return (
      <List.Item
        title={file.name}
        icon={getfileLightIcon(file.name, file.type)}
        actions={
          <ActionPanel>
            {file.type === "directory" && (
              <>
                <Action title="Open Directory" icon={Icon.Folder} onAction={() => handleGoToDirectory(file.path)} />
                <Action
                  title="Create Directory"
                  shortcut={{ key: "n", modifiers: ["cmd"] }}
                  icon={Icon.NewFolder}
                  onAction={handleShowCreateDirectoryForm}
                />
              </>
            )}

            {file.type === "file" && (
              <Action
                title="Download File"
                icon={Icon.Download}
                onAction={() => handleDownloadFile(file.path, file.name)}
              />
            )}
            <ActionPanel.Section title="Actions">
              <Action
                title="Upload File"
                icon={Icon.Upload}
                shortcut={{ key: "u", modifiers: ["cmd"] }}
                onAction={handleShowUploadForm}
              />

              <Action
                title="Rename"
                icon={Icon.Pencil}
                shortcut={{ key: "r", modifiers: ["cmd"] }}
                onAction={() => handleShowRenameForm(file.path, file.name, file.type === "file")}
              />
              <Action
                title="Delete"
                shortcut={{ key: "backspace", modifiers: ["cmd"] }}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteFile(file.path, file.name)}
              />
              {file.type === "file" && (
                <Action
                  title="Create Directory"
                  shortcut={{ key: "n", modifiers: ["cmd"] }}
                  icon={Icon.NewFolder}
                  onAction={handleShowCreateDirectoryForm}
                />
              )}
            </ActionPanel.Section>

            <ActionPanel.Section>
              <Action title="Disconnect Vps" icon={Icon.Plug} onAction={() => handleDisconnect()} />
            </ActionPanel.Section>
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={getItemMarkdown(file.name, file.type)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" text={file.type} />
                {file.type === "file" && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Size" text={prettyBytes(file.size ?? 0)} />
                  </>
                )}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Modified Time" text={file.modifiedTime.toLocaleString()} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Permissions" text={file.permissions} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Owner/Group" text={file.owner + "/" + file.group} />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  };

  const GoBackAction = () => {
    if (navigationHistory.length >= 1) {
      return (
        <List.Item
          title="Back"
          icon={Icon.ArrowLeft}
          actions={
            <ActionPanel>
              <Action
                title="Go Back"
                icon={Icon.ArrowLeft}
                shortcut={{ key: "[", modifiers: ["cmd"] }}
                onAction={() => handleGoBack()}
              />

              <ActionPanel.Section title="Actions">
                <Action
                  title="Upload File"
                  icon={Icon.Upload}
                  shortcut={{ key: "u", modifiers: ["cmd"] }}
                  onAction={handleShowUploadForm}
                />
                <Action
                  title="Create Directory"
                  shortcut={{ key: "n", modifiers: ["cmd"] }}
                  icon={Icon.NewFolder}
                  onAction={handleShowCreateDirectoryForm}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action title="Disconnect Vps" icon={Icon.Plug} onAction={() => handleDisconnect()} />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={files.length === 0 ? emptyfolderLightIcon : arrowLeftLightIcon}
              metadata={
                <List.Item.Detail.Metadata>
                  {files.length === 0 && (
                    <List.Item.Detail.Metadata.Label title="Empty Folder" text="No files found in this directory" />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      );
    }
    return null;
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          placeholder={`Sort by ${sortBy === "modifiedTime" ? "Date" : sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`}
          value={sortBy}
          onChange={(value) => setSortby(value as SortTypes)}
        >
          <List.Dropdown.Section title="Sort by">
            <List.Dropdown.Item title="Name" value="name" />
            <List.Dropdown.Item title="Modified Time" value="modifiedTime" />
            <List.Dropdown.Item title="Size" value="size" />
            <List.Dropdown.Item title="Kind" value="kind" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Upload File"
            icon={Icon.Upload}
            shortcut={{ key: "u", modifiers: ["cmd"] }}
            onAction={handleShowUploadForm}
          />
          <Action
            title="Create Directory"
            icon={Icon.NewFolder}
            shortcut={{ key: "n", modifiers: ["cmd"] }}
            onAction={handleShowCreateDirectoryForm}
          />
          <Action title="Disconnect" icon={Icon.Plug} onAction={() => handleDisconnect()} />
        </ActionPanel>
      }
      navigationTitle={currentPath}
    >
      {!isLoading && <GoBackAction />}

      {navigationHistory.length === 0 && !isLoading && (
        <MainDirectoryItem onGoToParentDirectory={() => handleGoToDirectory("..")} />
      )}

      {sortedFiles.map((file: FileItem, index: number) => {
        return <Item key={`${file.name}.${index}`} file={file} />;
      })}
    </List>
  );
}
