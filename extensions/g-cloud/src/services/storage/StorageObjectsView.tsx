import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Detail,
  Color,
  useNavigation,
  Alert,
  Form,
  Image,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { CloudStorageUploader } from "../../utils/FilePicker";
import { CloudStorageDownloader } from "../../utils/FileDownloader";
import { formatFileSize, validateFile, getFileInfo } from "../../utils/FileUtils";
import ObjectVersionsView from "./ObjectVersionsView";
import { ServiceViewBar } from "../../utils/ServiceViewBar";

const execPromise = promisify(exec);
const ITEMS_PER_PAGE = 11;

interface StorageObjectsViewProps {
  projectId: string;
  gcloudPath: string;
  bucketName: string;
  prefix?: string;
}

interface StorageObject {
  id: string;
  name: string;
  size: string;
  updated: string;
  contentType: string;
  isFolder: boolean;
}

interface Folder {
  name: string;
  path: string;
}

interface GCloudObject {
  id?: string;
  name: string;
  size?: string;
  updated?: string;
  contentType?: string;
  timeCreated?: string;
  storageClass?: string;
  md5Hash?: string;
}

export default function StorageObjectsView({
  projectId,
  gcloudPath,
  bucketName,
  prefix = "",
}: StorageObjectsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayedFolders, setDisplayedFolders] = useState<Folder[]>([]);
  const [displayedObjects, setDisplayedObjects] = useState<StorageObject[]>([]);
  const [allItems, setAllItems] = useState<{ folders: Folder[]; objects: StorageObject[] }>({
    folders: [],
    objects: [],
  });
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    fetchObjects();
  }, [prefix]);

  useEffect(() => {
    const startIdx = 0;
    const endIdx = currentPage * ITEMS_PER_PAGE;

    // Calculate how many items we can show in total for this page
    const totalItemsToShow = Math.min(endIdx, allItems.folders.length + allItems.objects.length);

    // First, try to fill with folders
    const foldersToShow = allItems.folders.slice(startIdx, Math.min(endIdx, allItems.folders.length));

    // Then fill remaining slots with objects
    const objectsStartIdx = 0;
    const objectsEndIdx = Math.max(0, totalItemsToShow - foldersToShow.length);
    const objectsToShow = allItems.objects.slice(objectsStartIdx, objectsEndIdx);

    setDisplayedFolders(foldersToShow);
    setDisplayedObjects(objectsToShow);

    // Calculate if we have more items to show
    const totalItems = allItems.folders.length + allItems.objects.length;
    const currentlyShowing = foldersToShow.length + objectsToShow.length;
    setHasMore(currentlyShowing < totalItems);
  }, [currentPage, allItems]);

  const updateItems = useCallback((newFolders: Folder[], newObjects: StorageObject[]) => {
    setAllItems((prev) => {
      // Use Sets to ensure uniqueness based on path for folders and id for objects
      const uniqueFolders = new Set([...prev.folders.map((f) => f.path), ...newFolders.map((f) => f.path)]);
      const uniqueObjects = new Set([...prev.objects.map((o) => o.id), ...newObjects.map((o) => o.id)]);

      return {
        folders: [...uniqueFolders].map(
          (path) => newFolders.find((f) => f.path === path) || prev.folders.find((f) => f.path === path)!,
        ),
        objects: [...uniqueObjects].map(
          (id) => newObjects.find((o) => o.id === id) || prev.objects.find((o) => o.id === id)!,
        ),
      };
    });
  }, []);

  async function fetchObjects() {
    if (isFetching) return;

    setIsFetching(true);
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    setAllItems({ folders: [], objects: [] });

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading objects...",
      message: `Bucket: ${bucketName}${prefix ? ` Prefix: ${prefix}` : ""}`,
    });

    try {
      const command = `${gcloudPath} storage ls gs://${bucketName}${prefix ? "/" + prefix : ""}`;

      //console.log(`Executing list command: ${command}`);
      const { stdout, stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      if (!stdout || stdout.trim() === "") {
        setIsLoading(false);
        loadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "No objects found",
          message: `Bucket "${bucketName}${prefix ? `/${prefix}` : ""}" is empty`,
        });
        return;
      }

      const lines = stdout.trim().split("\n");
      //console.log(`Found ${lines.length} items in response`);

      let batchFolders: Folder[] = [];
      let batchObjects: StorageObject[] = [];
      const BATCH_SIZE = 5;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.endsWith("/")) {
          // This is a folder
          const folderPath = trimmedLine.replace("gs://" + bucketName + "/", "");
          let folderName = folderPath;

          if (prefix && folderPath.startsWith(prefix + "/")) {
            folderName = folderPath.substring(prefix.length + 1);
          }

          if (folderName.endsWith("/")) {
            folderName = folderName.slice(0, -1);
          }

          batchFolders.push({
            name: folderName,
            path: folderPath.slice(0, -1),
          });

          if (batchFolders.length >= BATCH_SIZE) {
            updateItems(batchFolders, []);
            batchFolders = [];
          }
        } else {
          // This is an object
          const objectPath = trimmedLine.replace("gs://" + bucketName + "/", "");
          let objectName = objectPath;

          if (prefix && objectPath.startsWith(prefix + "/")) {
            objectName = objectPath.substring(prefix.length + 1);
          }

          if (objectName.includes(".gcloud_temp_empty")) {
            continue;
          }

          if (objectName.includes("/")) {
            const firstSegment = objectName.split("/")[0];
            const inferredFolderPath = prefix ? `${prefix}/${firstSegment}` : firstSegment;

            const folderExists =
              allItems.folders.some((f) => f.path === inferredFolderPath) ||
              batchFolders.some((f) => f.path === inferredFolderPath);

            if (!folderExists) {
              batchFolders.push({
                name: firstSegment,
                path: inferredFolderPath,
              });

              if (batchFolders.length >= BATCH_SIZE) {
                updateItems(batchFolders, []);
                batchFolders = [];
              }
            }
            continue;
          }

          try {
            const detailsCommand = `${gcloudPath} storage objects describe gs://${bucketName}/${objectPath} --format=json --project=${projectId}`;
            const { stdout: detailsOutput, stderr: detailsError } = await execPromise(detailsCommand);

            if (detailsError && detailsError.includes("ERROR")) {
              console.warn(`Error getting details for ${objectName}:`, detailsError);
              continue;
            }

            const details = JSON.parse(detailsOutput);

            batchObjects.push({
              id: details.id || details.name || objectName,
              name: objectName,
              size: formatFileSize(details.size ? parseInt(details.size) : 0),
              updated: details.updated || details.timeCreated || new Date().toISOString(),
              contentType: details.contentType || guessContentTypeFromName(objectName),
              isFolder: false,
            });

            if (batchObjects.length >= BATCH_SIZE) {
              updateItems([], batchObjects);
              batchObjects = [];
            }
          } catch (detailsError) {
            console.warn(`Failed to get details for ${objectName}:`, detailsError);
            batchObjects.push({
              id: objectName,
              name: objectName,
              size: "Unknown",
              updated: new Date().toISOString(),
              contentType: guessContentTypeFromName(objectName),
              isFolder: false,
            });

            if (batchObjects.length >= BATCH_SIZE) {
              updateItems([], batchObjects);
              batchObjects = [];
            }
          }
        }
      }

      // Update any remaining items in the batches
      if (batchFolders.length > 0 || batchObjects.length > 0) {
        updateItems(batchFolders, batchObjects);
      }

      loadingToast.hide();
      setIsLoading(false);
      showToast({
        style: Toast.Style.Success,
        title: "Content loaded",
        message: `Found ${allItems.folders.length} folders and ${allItems.objects.length} objects`,
      });
    } catch (error: unknown) {
      loadingToast.hide();
      console.error("Error fetching objects:", error);

      let errorMessage = error instanceof Error ? error.message : String(error);
      let errorTitle = "Failed to load objects";

      if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = `You don't have permission to list objects in bucket "${bucketName}".`;
      } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        errorTitle = "Bucket not found";
        errorMessage = `The bucket "${bucketName}" was not found. It may have been deleted.`;
      } else if (errorMessage.includes("project not found")) {
        errorTitle = "Project not found";
        errorMessage = `The project "${projectId}" was not found or you don't have access to it.`;
      }

      setError(`${errorTitle}: ${errorMessage}`);

      showFailureToast({
        title: errorTitle,
        message: errorMessage,
      });
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  }

  function loadMoreItems() {
    setCurrentPage((prev) => prev + 1);
  }

  function navigateToFolder(folder: Folder) {
    push(
      <StorageObjectsView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} prefix={folder.path} />,
    );
  }

  async function deleteObject(objectName: string) {
    const fullObjectPath = prefix ? `${prefix}/${objectName}` : objectName;

    if (
      await confirmAlert({
        title: "Delete Object",
        message: `Are you sure you want to delete "${objectName}"?`,
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const deletingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting object...",
        message: objectName,
      });

      try {
        const command = `${gcloudPath} storage rm gs://${bucketName}/${fullObjectPath} --project=${projectId}`;

        //console.log(`Executing delete command: ${command}`);
        const { stderr } = await execPromise(command);

        if (stderr && stderr.includes("ERROR")) {
          throw new Error(stderr);
        }

        deletingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Object deleted successfully",
          message: objectName,
        });

        fetchObjects();
      } catch (error: unknown) {
        deletingToast.hide();
        console.error("Error deleting object:", error);

        let errorMessage = error instanceof Error ? error.message : String(error);
        let errorTitle = "Failed to delete object";

        if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to delete this object.";
        } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          errorTitle = "Object not found";
          errorMessage = `The object "${objectName}" was not found. It may have been deleted already.`;
        }

        showFailureToast({
          title: errorTitle,
          message: errorMessage,
        });
      }
    }
  }

  // This function is used indirectly through CloudStorageDownloader
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  async function performDownload(objectName: string, downloadPath?: string) {
    if (downloadPath) {
      const downloadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading object...",
        message: `To: ${downloadPath}`,
      });

      try {
        const fullObjectPath = prefix ? `${prefix}/${objectName}` : objectName;
        const command = `${gcloudPath} storage cp gs://${bucketName}/${fullObjectPath} ${downloadPath} --project=${projectId}`;

        //console.log(`Executing download command: ${command}`);
        const { stderr } = await execPromise(command);

        if (stderr && stderr.includes("ERROR")) {
          throw new Error(stderr);
        }

        downloadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Download complete",
          message: `Saved to ${downloadPath}`,
        });
      } catch (error: unknown) {
        downloadingToast.hide();
        console.error("Error downloading object:", error);

        let errorMessage = error instanceof Error ? error.message : String(error);
        let errorTitle = "Failed to download object";

        if (typeof errorMessage === "string") {
          if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
            errorTitle = "Permission denied";
            errorMessage = "You don't have permission to download this object.";
          } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
            errorTitle = "Object not found";
            errorMessage = `The object "${objectName}" was not found.`;
          } else if (errorMessage.includes("EACCES") || errorMessage.includes("access denied")) {
            errorTitle = "Access denied";
            errorMessage = `Cannot write to ${downloadPath}. Please check your file permissions.`;
          }
        }

        showFailureToast({
          title: errorTitle,
          message: errorMessage,
        });
      }
    } else {
      const safeFileName = objectName.split("/").pop() || "download";

      push(
        <CloudStorageDownloader
          onDownload={(path) => performDownload(objectName, path)}
          fileName={safeFileName}
          bucketName={bucketName}
          objectName={objectName}
          title="Download Object"
        />,
      );
    }
  }

  async function uploadObject(filePath: string) {
    const isValid = await validateFile(filePath);
    if (!isValid) return;

    const fileInfo = await getFileInfo(filePath);
    if (!fileInfo) return;

    const uploadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading object...",
      message: fileInfo.name,
    });

    try {
      const destinationPath = prefix
        ? `gs://${bucketName}/${prefix}/${fileInfo.name}`
        : `gs://${bucketName}/${fileInfo.name}`;

      const command = `${gcloudPath} storage cp ${filePath} ${destinationPath} --project=${projectId}`;

      //console.log(`Executing upload command: ${command}`);
      const { stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      uploadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Upload complete",
        message: `Uploaded to ${destinationPath}`,
      });

      fetchObjects();
    } catch (error: unknown) {
      uploadingToast.hide();
      console.error("Error uploading object:", error);

      let errorMessage = error instanceof Error ? error.message : String(error);
      let errorTitle = "Failed to upload object";

      if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = "You don't have permission to upload to this bucket.";
      } else if (errorMessage.includes("ENOENT") || errorMessage.includes("no such file")) {
        errorTitle = "File not found";
        errorMessage = `The file "${filePath}" was not found.`;
      } else if (errorMessage.includes("EACCES") || errorMessage.includes("access denied")) {
        errorTitle = "Access denied";
        errorMessage = `Cannot read from ${filePath}. Please check your file permissions.`;
      }

      showFailureToast({
        title: errorTitle,
        message: errorMessage,
      });
    }
  }

  async function selectAndUploadFile() {
    push(
      <CloudStorageUploader
        onFilePicked={(filePath) => uploadObject(filePath)}
        destinationInfo={`Bucket: ${bucketName}`}
        title="Upload File to Google Cloud Storage"
      />,
    );
  }

  async function directDownloadObject(objectName: string) {
    const fullObjectPath = prefix ? `${prefix}/${objectName}` : objectName;
    const safeFileName = objectName.split("/").pop() || "download";

    const downloadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading object...",
      message: fullObjectPath,
    });

    try {
      const tempDownloadPath = join(homedir(), "Downloads", safeFileName);
      const command = `${gcloudPath} storage cp gs://${bucketName}/${fullObjectPath} ${tempDownloadPath} --project=${projectId}`;

      //console.log(`Executing download command: ${command}`);
      const { stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      downloadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Download complete",
        message: `Saved to ${tempDownloadPath}`,
      });
    } catch (error: unknown) {
      downloadingToast.hide();
      console.error("Error downloading object:", error);

      let errorMessage = error instanceof Error ? error.message : String(error);
      let errorTitle = "Failed to download object";

      if (typeof errorMessage === "string") {
        if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to download this object.";
        } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          errorTitle = "Object not found";
          errorMessage = `The object "${fullObjectPath}" was not found.`;
        } else if (errorMessage.includes("EACCES") || errorMessage.includes("access denied")) {
          errorTitle = "Access denied";
          errorMessage = `Cannot write to the download location. Please check your file permissions.`;
        }
      }

      showFailureToast({
        title: errorTitle,
        message: errorMessage,
      });
    }
  }

  function getContentTypeIcon(contentType: string): Image.Source {
    if (contentType.startsWith("image/")) {
      return Icon.Image;
    } else if (contentType.startsWith("text/")) {
      return Icon.Text;
    } else if (contentType.startsWith("application/pdf")) {
      return Icon.Document;
    } else if (contentType.startsWith("application/json")) {
      return Icon.Code;
    } else if (contentType.startsWith("application/")) {
      return Icon.Download;
    } else {
      return Icon.Document;
    }
  }

  async function viewObjectDetails(objectName: string) {
    const fullObjectPath = prefix ? `${prefix}/${objectName}` : objectName;

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading object details...",
      message: objectName,
    });

    try {
      const command = `${gcloudPath} storage objects describe gs://${bucketName}/${fullObjectPath} --format=json --project=${projectId}`;

      //console.log(`Executing describe command: ${command}`);
      const { stdout, stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      loadingToast.hide();

      const objectData = JSON.parse(stdout) as GCloudObject;

      const detailsMarkdown =
        `# Object Details\n\n` +
        `**Name:** ${objectName}\n\n` +
        `**Bucket:** ${bucketName}${prefix ? `/${prefix}` : ""}\n\n` +
        `**Size:** ${formatFileSize(objectData.size ? parseInt(objectData.size) : 0)}\n\n` +
        `**Content Type:** ${objectData.contentType || guessContentTypeFromName(objectName)}\n\n` +
        `**Created:** ${objectData.timeCreated ? new Date(objectData.timeCreated).toLocaleString() : "Unknown"}\n\n` +
        `**Updated:** ${objectData.updated ? new Date(objectData.updated).toLocaleString() : "Unknown"}\n\n` +
        `**Storage Class:** ${objectData.storageClass || "Standard"}\n\n` +
        `**MD5 Hash:** ${objectData.md5Hash || "N/A"}\n\n`;

      push(
        <Detail
          navigationTitle={`Object: ${objectName}`}
          markdown={detailsMarkdown}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="Name" text={objectName} />
              <Detail.Metadata.Label title="Bucket" text={bucketName} />
              {prefix && <Detail.Metadata.Label title="Folder" text={prefix} />}
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Size"
                text={formatFileSize(objectData.size ? parseInt(objectData.size) : 0)}
              />
              <Detail.Metadata.Label
                title="Content Type"
                text={objectData.contentType || guessContentTypeFromName(objectName)}
              />
              <Detail.Metadata.Label title="Storage Class" text={objectData.storageClass || "Standard"} />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Created"
                text={objectData.timeCreated ? new Date(objectData.timeCreated).toLocaleString() : "Unknown"}
              />
              <Detail.Metadata.Label
                title="Updated"
                text={objectData.updated ? new Date(objectData.updated).toLocaleString() : "Unknown"}
              />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="MD5 Hash" text={objectData.md5Hash || "N/A"} />
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action title="Download" icon={Icon.Download} onAction={() => directDownloadObject(objectName)} />
              <Action
                title="View Versions"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
                onAction={() =>
                  push(
                    <ObjectVersionsView
                      projectId={projectId}
                      gcloudPath={gcloudPath}
                      bucketName={bucketName}
                      objectName={fullObjectPath}
                    />,
                  )
                }
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteObject(objectName)}
              />
              <Action
                title="Back to Objects"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={() => pop()}
              />
              <Action
                title="Back to Buckets"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                onAction={() => {
                  pop();
                  pop();
                }}
              />
            </ActionPanel>
          }
        />,
      );
    } catch (error: unknown) {
      loadingToast.hide();
      console.error("Error fetching object details:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      showFailureToast({
        title: "Failed to fetch object details",
        message: errorMessage,
      });
    }
  }

  function guessContentTypeFromName(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      txt: "text/plain",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      json: "application/json",
      xml: "application/xml",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      zip: "application/zip",
      rar: "application/x-rar-compressed",
      tar: "application/x-tar",
      gz: "application/gzip",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      webm: "video/webm",
    };

    return contentTypeMap[ext] || "application/octet-stream";
  }

  async function createFolder(folderName: string) {
    if (!folderName) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid folder name",
        message: "Please provide a valid folder name",
      });
      return;
    }

    let normalizedName = folderName.trim();
    normalizedName = normalizedName.replace(/^\/+|\/+$/g, "");

    const folderPath = normalizedName + "/";

    let fullPath;
    if (prefix) {
      fullPath = `${prefix}/${folderPath}`;
    } else {
      fullPath = folderPath;
    }

    const gcsPath = `gs://${bucketName}/${fullPath}`;

    const creatingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating folder...",
      message: fullPath,
    });

    try {
      const tempFile = join(homedir(), ".gcloud_temp_empty");
      await execPromise(`touch ${tempFile}`);

      const command = `${gcloudPath} storage cp ${tempFile} ${gcsPath} --project=${projectId}`;
      //console.log(`Creating folder with command: ${command}`);

      const { stderr } = await execPromise(command);

      await execPromise(`rm ${tempFile}`);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      creatingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Folder created",
        message: `Created folder: ${fullPath}`,
      });

      fetchObjects();
    } catch (error: unknown) {
      creatingToast.hide();
      console.error("Error creating folder:", error);

      let errorMessage = error instanceof Error ? error.message : String(error);
      let errorTitle = "Failed to create folder";

      if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = "You don't have permission to create folders in this bucket.";
      }

      showFailureToast({
        title: errorTitle,
        message: errorMessage,
      });
    }
  }

  function showCreateFolderForm() {
    push(
      <Form
        navigationTitle="Create Folder"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Folder"
              onSubmit={({ name }) => {
                pop();
                createFolder(name);
              }}
            />
            <Action title="Cancel" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "escape" }} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="name"
          title="Folder Name"
          placeholder="my-folder"
          info={`Creates a folder in ${prefix ? prefix + "/" : ""}`}
          autoFocus
        />
      </Form>,
    );
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          title={error}
          description="Failed to load objects"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={fetchObjects} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const showCurrentPath = prefix ? `${bucketName}/${prefix}` : bucketName;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search objects..."
      navigationTitle={`Objects in ${showCurrentPath}`}
      isShowingDetail
      searchBarAccessory={<ServiceViewBar projectId={projectId} gcloudPath={gcloudPath} serviceName="storage" />}
      actions={
        <ActionPanel>
          <Action
            title="Upload File"
            icon={Icon.Upload}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={selectAndUploadFile}
          />
          <Action
            title="Create Folder"
            icon={Icon.NewFolder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            onAction={showCreateFolderForm}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => fetchObjects()}
          />
          <Action
            title="Back to Buckets"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      {displayedFolders.length === 0 && displayedObjects.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No items found"
          description={`Bucket "${showCurrentPath}" is empty. Upload a file or create a folder to get started.`}
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Upload File"
                icon={Icon.Upload}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={selectAndUploadFile}
              />
              <Action
                title="Create Folder"
                icon={Icon.NewFolder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={showCreateFolderForm}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => fetchObjects()} />
              {prefix && (
                <Action
                  title="Go Back"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={pop}
                />
              )}
              <Action
                title="Back to Buckets"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={pop}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Contents">
          {prefix && (
            <List.Item
              title=".."
              subtitle="Parent Directory"
              icon={Icon.ArrowUp}
              accessories={[{ text: "Go back" }]}
              actions={
                <ActionPanel>
                  <Action title="Go Up" icon={Icon.ArrowUp} onAction={pop} />
                </ActionPanel>
              }
            />
          )}

          {displayedFolders.map((folder) => (
            <List.Item
              key={folder.path}
              title={folder.name}
              subtitle="Folder"
              icon={Icon.Folder}
              accessories={[{ icon: Icon.ChevronRight }]}
              actions={
                <ActionPanel>
                  <Action title="Open Folder" icon={Icon.Folder} onAction={() => navigateToFolder(folder)} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => fetchObjects()} />
                  <Action
                    title="Upload File"
                    icon={Icon.Upload}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={selectAndUploadFile}
                  />
                  <Action
                    title="Create Folder"
                    icon={Icon.NewFolder}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    onAction={showCreateFolderForm}
                  />
                </ActionPanel>
              }
            />
          ))}

          {displayedObjects.map((obj) => (
            <List.Item
              key={obj.id}
              title={obj.name}
              subtitle={obj.contentType}
              icon={{ source: getContentTypeIcon(obj.contentType) }}
              accessories={[{ text: obj.size }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={obj.name} />
                      <List.Item.Detail.Metadata.Label title="Size" text={obj.size} />
                      <List.Item.Detail.Metadata.Label title="Type" text={obj.contentType} />
                      <List.Item.Detail.Metadata.Label
                        title="Last Modified"
                        text={new Date(obj.updated).toLocaleString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action title="View Details" icon={Icon.Eye} onAction={() => viewObjectDetails(obj.name)} />
                  <Action
                    title="View Versions"
                    icon={Icon.Clock}
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                    onAction={() =>
                      push(
                        <ObjectVersionsView
                          projectId={projectId}
                          gcloudPath={gcloudPath}
                          bucketName={bucketName}
                          objectName={obj.name}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Download"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => directDownloadObject(obj.name)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={() => deleteObject(obj.name)}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => fetchObjects()} />
                  <Action
                    title="Upload File"
                    icon={Icon.Upload}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={selectAndUploadFile}
                  />
                  <Action
                    title="Create Folder"
                    icon={Icon.NewFolder}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    onAction={showCreateFolderForm}
                  />
                </ActionPanel>
              }
            />
          ))}

          {hasMore && (
            <List.Item
              title="Load More..."
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action title="Load More" icon={Icon.Plus} onAction={loadMoreItems} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
