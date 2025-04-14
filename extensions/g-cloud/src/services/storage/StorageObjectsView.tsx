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
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { CloudStorageUploader } from "../../utils/FilePicker";
import { CloudStorageDownloader } from "../../utils/FileDownloader";
import { formatFileSize, validateFile, getFileInfo } from "../../utils/FileUtils";
import ObjectVersionsView from "./ObjectVersionsView";

const execPromise = promisify(exec);

interface StorageObjectsViewProps {
  projectId: string;
  gcloudPath: string;
  bucketName: string;
}

interface StorageObject {
  id: string;
  name: string;
  size: string;
  updated: string;
  contentType: string;
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

export default function StorageObjectsView({ projectId, gcloudPath, bucketName }: StorageObjectsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  useEffect(() => {
    fetchObjects();
  }, []);

  async function fetchObjects() {
    setIsLoading(true);
    setError(null);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading objects...",
      message: `Bucket: ${bucketName}`,
    });

    try {
      const command = `${gcloudPath} storage objects list gs://${bucketName} --project=${projectId} --format=json`;

      // console.log(`Executing list command: ${command}`);
      const { stdout, stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      if (!stdout || stdout.trim() === "") {
        setObjects([]);
        loadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "No objects found",
          message: `Bucket "${bucketName}" is empty`,
        });
        setIsLoading(false);
        return;
      }

      const result = JSON.parse(stdout);

      const formattedObjects = result.map((obj: GCloudObject) => {
        return {
          id: obj.id || obj.name,
          name: obj.name,
          size: formatFileSize(obj.size ? parseInt(obj.size) : 0),
          updated: obj.updated || new Date().toISOString(),
          contentType: obj.contentType || guessContentTypeFromName(obj.name),
        };
      });

      setObjects(formattedObjects);

      loadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Objects loaded",
        message: `Found ${formattedObjects.length} objects`,
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

      showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteObject(objectName: string) {
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
        const command = `${gcloudPath} storage rm gs://${bucketName}/${objectName} --project=${projectId} --quiet`;

        // console.log(`Executing delete command: ${command}`);
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

        showToast({
          style: Toast.Style.Failure,
          title: errorTitle,
          message: errorMessage,
        });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function performDownload(objectName: string, downloadPath?: string) {
    if (downloadPath) {
      // If downloadPath is provided, download directly to that path
      const downloadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading object...",
        message: `To: ${downloadPath}`,
      });

      try {
        // Use the correct command: gcloud storage cp for copying files from buckets
        const command = `${gcloudPath} storage cp gs://${bucketName}/${objectName} ${downloadPath} --project=${projectId}`;

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

        // Provide more user-friendly error messages for common errors
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

        showToast({
          style: Toast.Style.Failure,
          title: errorTitle,
          message: errorMessage,
        });
      }
    } else {
      // If no downloadPath is provided, show the download picker
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
    // Validate the file first
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
      // Use the correct command: gcloud storage cp for copying files to buckets
      const command = `${gcloudPath} storage cp ${filePath} gs://${bucketName}/${fileInfo.name} --project=${projectId}`;

      // console.log(`Executing upload command: ${command}`);
      const { stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      uploadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Upload complete",
        message: fileInfo.name,
      });

      fetchObjects();
    } catch (error: unknown) {
      uploadingToast.hide();
      console.error("Error uploading object:", error);

      // Provide more user-friendly error messages for common errors
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

      showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: errorMessage,
      });
    }
  }

  // Modify the selectAndUploadFile function to use the CloudStorageUploader component
  async function selectAndUploadFile() {
    push(
      <CloudStorageUploader
        onFilePicked={(filePath) => uploadObject(filePath)}
        destinationInfo={`Bucket: ${bucketName}`}
        title="Upload File to Google Cloud Storage"
      />,
    );
  }

  // Add a new function to handle direct file download using the native save dialog
  async function directDownloadObject(objectName: string) {
    const safeFileName = objectName.split("/").pop() || "download";

    const downloadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading object...",
      message: objectName,
    });

    try {
      const tempDownloadPath = join(homedir(), "Downloads", safeFileName);
      const command = `${gcloudPath} storage cp gs://${bucketName}/${objectName} ${tempDownloadPath} --project=${projectId}`;

      // console.log(`Executing download command: ${command}`);
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
          errorMessage = `The object "${objectName}" was not found.`;
        } else if (errorMessage.includes("EACCES") || errorMessage.includes("access denied")) {
          errorTitle = "Access denied";
          errorMessage = `Cannot write to the download location. Please check your file permissions.`;
        }
      }

      showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: errorMessage,
      });
    }
  }

  function getContentTypeIcon(contentType: string) {
    if (contentType.startsWith("image/")) {
      return { source: Icon.Image, tintColor: Color.Purple };
    } else if (contentType.startsWith("text/")) {
      return { source: Icon.Text, tintColor: Color.Blue };
    } else if (contentType.startsWith("application/pdf")) {
      return { source: Icon.Document, tintColor: Color.Red };
    } else if (contentType.startsWith("application/json")) {
      return { source: Icon.Code, tintColor: Color.Yellow };
    } else if (contentType.startsWith("application/")) {
      return { source: Icon.Download, tintColor: Color.Green };
    } else {
      return { source: Icon.Document, tintColor: Color.PrimaryText };
    }
  }

  async function viewObjectDetails(objectName: string) {
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading object details...",
      message: objectName,
    });

    try {
      const command = `${gcloudPath} storage objects describe gs://${bucketName}/${objectName} --project=${projectId} --format=json`;

      // console.log(`Executing describe command: ${command}`);
      const { stdout, stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      loadingToast.hide();

      const objectData = JSON.parse(stdout) as GCloudObject;

      const detailsMarkdown =
        `# Object Details\n\n` +
        `**Name:** ${objectName}\n\n` +
        `**Bucket:** ${bucketName}\n\n` +
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
                      objectName={objectName}
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
      showToast({
        style: Toast.Style.Failure,
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search objects..."
      navigationTitle={`Objects in ${bucketName}`}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Upload File"
            icon={Icon.Upload}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={selectAndUploadFile}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchObjects}
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
      {objects.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No objects found"
          description={`Bucket "${bucketName}" is empty. Upload a file to get started.`}
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Upload File"
                icon={Icon.Upload}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={selectAndUploadFile}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchObjects} />
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
        <List.Section title={`Objects in ${bucketName}`} subtitle={`${objects.length} objects`}>
          {objects.map((obj) => (
            <List.Item
              key={obj.id}
              title={obj.name}
              subtitle={obj.contentType}
              icon={getContentTypeIcon(obj.contentType)}
              accessories={[
                { text: obj.size, tooltip: "Size" },
                { text: new Date(obj.updated).toLocaleDateString(), tooltip: "Last Updated" },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${obj.name.split("/").pop() || obj.name}\n\n**Size:** ${obj.size}\n\n**Content Type:** ${obj.contentType}\n\n**Last Updated:** ${new Date(obj.updated).toLocaleString()}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={obj.name} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Size" text={obj.size} />
                      <List.Item.Detail.Metadata.Label title="Content Type" text={obj.contentType} />
                      <List.Item.Detail.Metadata.Label
                        title="Last Updated"
                        text={new Date(obj.updated).toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Bucket" text={bucketName} />
                      <List.Item.Detail.Metadata.Label title="Project" text={projectId} />
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
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchObjects} />
                  <Action
                    title="Upload File"
                    icon={Icon.Upload}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={selectAndUploadFile}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
