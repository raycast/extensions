import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Color,
  confirmAlert,
  open,
  Detail,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import * as Minio from "minio";
import * as path from "path";

interface Preferences {
  endpoint: string;
  port: string;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
  defaultBucket: string;
  publicUrlBase?: string;
}

interface MinioObject {
  name: string;
  size: number;
  lastModified: Date;
  etag: string;
  isDirectory: boolean;
}

// Maximum preview file size (50MB)
const MAX_PREVIEW_SIZE = 50 * 1024 * 1024;

// Image file extensions
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];

// Text file extensions
const TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".py",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1",
  ".jsonl",
  ".lrc",
];

// Audio file extensions
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".flac"];

// Video file extensions
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"];

// Previewable file types
const PREVIEWABLE_EXTENSIONS = [...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS, ...TEXT_EXTENSIONS];

// Use Detail component to preview files
function FilePreviewDetail(props: {
  url: string;
  fileName: string;
  fileSize: number;
  bucket: string;
  objectName: string;
  fileType: string;
  textContent?: string;
}) {
  const { url, fileName, fileSize, bucket, objectName, fileType, textContent } = props;
  const ext = path.extname(fileName).toLowerCase();

  // Create markdown for different file types
  let markdown = `# ${fileName}\n\n`;
  if (IMAGE_EXTENSIONS.includes(ext)) {
    markdown += `![${fileName}](${url})`;
  } else if (TEXT_EXTENSIONS.includes(ext) && textContent) {
    markdown += `\`\`\`${ext.substring(1)}\n${textContent}\n\`\`\``;
  } else {
    markdown += `[Click here to view file](${url})`;
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Preview: ${fileName}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="File Name" text={fileName} />
          <Detail.Metadata.Label title="Size" text={formatFileSize(fileSize)} />
          <Detail.Metadata.Label title="Type" text={fileType} />
          <Detail.Metadata.Label title="Location" text={`${bucket}/${objectName}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Open File" target={url} text="Open in Browser" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy File URL" content={url} />
          {textContent && <Action.CopyToClipboard title="Copy File Content" content={textContent} />}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [objects, setObjects] = useState<MinioObject[]>([]);
  const currentBucket = useState(preferences.defaultBucket)[0];
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [useSSL, setUseSSL] = useState(preferences.useSSL);

  // Initialize MinIO client
  const getMinioClient = () => {
    // Remove protocol prefix from endpoint
    let endpoint = preferences.endpoint;
    endpoint = endpoint.replace(/^https?:\/\//, "");

    const port = preferences.port ? parseInt(preferences.port) : useSSL ? 443 : 80;
    return new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: preferences.accessKey,
      secretKey: preferences.secretKey,
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Check if file is previewable
  const isPreviewable = (objectName: string, size: number): boolean => {
    if (size > MAX_PREVIEW_SIZE) return false;

    const ext = path.extname(objectName).toLowerCase();
    return PREVIEWABLE_EXTENSIONS.includes(ext);
  };

  // Check if Detail preview can be used (requires publicUrlBase configuration)
  const canUseDetailPreview = (): boolean => {
    return !!preferences.publicUrlBase;
  };

  // Generate public URL for file
  const generatePublicUrl = (bucket: string, objectName: string): string | null => {
    if (!preferences.publicUrlBase) {
      return null;
    }

    // Remove trailing slash if present
    const baseUrl = preferences.publicUrlBase.endsWith("/")
      ? preferences.publicUrlBase.slice(0, -1)
      : preferences.publicUrlBase;

    // Check if URL already contains bucket
    if (baseUrl.includes(bucket)) {
      return `${baseUrl}/${objectName}`;
    } else {
      return `${baseUrl}/${bucket}/${objectName}`;
    }
  };

  // Get temporary file link and open in browser
  const downloadAndOpenFile = async (obj: MinioObject) => {
    try {
      // Confirm action
      const confirmed = await confirmAlert({
        title: "Confirm Action",
        message: `Open ${path.basename(obj.name)} in browser?`,
        primaryAction: {
          title: "Open",
        },
      });

      if (!confirmed) return;

      await showToast({
        style: Toast.Style.Animated,
        title: "Generating temporary link...",
      });

      // Get MinIO client
      const minioClient = getMinioClient();

      // Generate presigned URL valid for 1 hour
      const expiryInSeconds = 60 * 60; // 1 hour
      const presignedUrl = await minioClient.presignedGetObject(currentBucket, obj.name, expiryInSeconds);

      // Open link in browser
      await open(presignedUrl);

      await showToast({
        style: Toast.Style.Success,
        title: "File opened in browser",
        message: "Temporary link valid for 1 hour",
      });
    } catch (err) {
      console.error("Error generating presigned URL:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate link",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // List objects
  const listObjects = async (bucket: string, prefix: string = "", retryWithoutSSL = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const minioClient = getMinioClient();

      // Check if bucket exists
      const bucketExists = await minioClient.bucketExists(bucket);
      if (!bucketExists) {
        setError(`Bucket '${bucket}' does not exist`);
        setObjects([]);
        return;
      }

      // Get object list
      const objectsStream = minioClient.listObjectsV2(bucket, prefix, true);
      const objects: MinioObject[] = [];
      const directories = new Set<string>();

      // Process object stream
      await new Promise<void>((resolve, reject) => {
        objectsStream.on("data", (obj: { name: string; size: number; lastModified: Date; etag: string }) => {
          if (!obj.name || obj.name === prefix) return;

          // Handle directories
          const relativePath = obj.name.slice(prefix.length);
          const parts = relativePath.split("/");

          if (parts.length > 1 && parts[0] !== "") {
            const dirName = prefix + parts[0] + "/";
            if (!directories.has(dirName)) {
              directories.add(dirName);
              objects.push({
                name: dirName,
                size: 0,
                lastModified: new Date(),
                etag: "",
                isDirectory: true,
              });
            }
          } else {
            objects.push({
              name: obj.name,
              size: obj.size || 0,
              lastModified: obj.lastModified || new Date(),
              etag: obj.etag || "",
              isDirectory: false,
            });
          }
        });

        objectsStream.on("error", (err) => {
          reject(err);
        });

        objectsStream.on("end", () => {
          resolve();
        });
      });

      // Sort: directories first, then files
      objects.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      setObjects(objects);
    } catch (err) {
      console.error("Error listing objects:", err);

      // Check for SSL connection error, if so, try non-SSL connection
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        retryWithoutSSL &&
        useSSL &&
        (errorMessage.includes("TLS connection") ||
          errorMessage.includes("ECONNRESET") ||
          errorMessage.includes("certificate"))
      ) {
        // Switch to non-SSL mode and retry
        setUseSSL(false);
        await showToast({
          style: Toast.Style.Animated,
          title: "Trying non-SSL connection",
          message: "Secure connection failed, trying insecure connection",
        });

        // No more retries to avoid infinite loop
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to directory
  const navigateToDirectory = (directoryPath: string) => {
    setCurrentPrefix(directoryPath);
    listObjects(currentBucket, directoryPath);
  };

  // Navigate up to parent directory
  const navigateUp = () => {
    if (!currentPrefix) return;

    const parts = currentPrefix.split("/").filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join("/") + "/" : "";

    setCurrentPrefix(newPrefix);
    listObjects(currentBucket, newPrefix);
  };

  // Delete object
  const deleteObject = async (objectName: string) => {
    try {
      // Confirm deletion
      const confirmed = await confirmAlert({
        title: "Confirm Delete",
        message: `Delete ${path.basename(objectName)}?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      const minioClient = getMinioClient();
      await minioClient.removeObject(currentBucket, objectName);

      await showToast({
        style: Toast.Style.Success,
        title: "Delete Successful",
        message: path.basename(objectName),
      });

      // Refresh list
      listObjects(currentBucket, currentPrefix);
    } catch (err) {
      console.error("Error deleting object:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete Failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Toggle SSL mode
  const toggleSSL = () => {
    const newSSLMode = !useSSL;
    setUseSSL(newSSLMode);
    showToast({
      style: Toast.Style.Success,
      title: newSSLMode ? "SSL Enabled" : "SSL Disabled",
    });
    listObjects(currentBucket, currentPrefix);
  };

  // Initial load
  useEffect(() => {
    listObjects(currentBucket, currentPrefix);
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search files..."
      navigationTitle={`MinIO: ${currentBucket}${currentPrefix ? `/${currentPrefix}` : ""}`}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => listObjects(currentBucket, currentPrefix)}
          />
          {currentPrefix && <Action title="Go up" icon={Icon.ArrowUp} onAction={navigateUp} />}
          <Action
            title={useSSL ? "Disable Ssl" : "Enable Ssl"}
            icon={useSSL ? Icon.Lock : Icon.LockUnlocked}
            onAction={toggleSSL}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          title="Error"
          description={error}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => listObjects(currentBucket, currentPrefix)}
              />
              <Action
                title={useSSL ? "Try Without Ssl" : "Try with Ssl"}
                icon={useSSL ? Icon.LockUnlocked : Icon.Lock}
                onAction={toggleSSL}
              />
            </ActionPanel>
          }
        />
      ) : objects.length === 0 ? (
        <List.EmptyView
          title="No Files"
          description={`No files found in ${currentBucket}${currentPrefix ? `/${currentPrefix}` : ""}`}
          icon={{ source: Icon.Document, tintColor: Color.PrimaryText }}
        />
      ) : (
        objects.map((obj) => (
          <List.Item
            key={obj.name}
            title={path.basename(obj.name)}
            subtitle={obj.isDirectory ? "Directory" : formatFileSize(obj.size)}
            icon={obj.isDirectory ? Icon.Folder : Icon.Document}
            accessories={[
              {
                text: obj.isDirectory ? "" : new Date(obj.lastModified).toLocaleDateString(),
              },
              {
                icon: isPreviewable(obj.name, obj.size)
                  ? canUseDetailPreview()
                    ? Icon.Eye
                    : Icon.Download
                  : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                {obj.isDirectory ? (
                  <Action title="Open Directory" icon={Icon.Folder} onAction={() => navigateToDirectory(obj.name)} />
                ) : (
                  <>
                    {isPreviewable(obj.name, obj.size) && canUseDetailPreview() && (
                      <Action.Push
                        title="Preview in Raycast"
                        icon={Icon.Eye}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                        target={
                          <SimplePreviewLoader objectName={obj.name} objectSize={obj.size} bucket={currentBucket} />
                        }
                      />
                    )}
                    <Action
                      title="Generate Temporary Link"
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                      onAction={() => downloadAndOpenFile(obj)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Object Name"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                      content={obj.name}
                    />
                    {canUseDetailPreview() && (
                      <Action.CopyToClipboard
                        title="Copy Public URL"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        content={generatePublicUrl(currentBucket, obj.name) || ""}
                      />
                    )}
                    <Action
                      title="Delete Object"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                      onAction={() => deleteObject(obj.name)}
                    />
                  </>
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => listObjects(currentBucket, currentPrefix)}
                />
                {currentPrefix && <Action title="Go up" icon={Icon.ArrowUp} onAction={navigateUp} />}
                <Action
                  title={useSSL ? "Disable Ssl" : "Enable Ssl"}
                  icon={useSSL ? Icon.Lock : Icon.LockUnlocked}
                  onAction={toggleSSL}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// Simple preview loader component
function SimplePreviewLoader(props: { objectName: string; objectSize: number; bucket: string }) {
  const { objectName, objectSize, bucket } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<{
    url: string;
    fileName: string;
    fileSize: number;
    bucket: string;
    objectName: string;
    fileType: string;
    textContent?: string;
  } | null>(null);

  const preferences = getPreferenceValues<Preferences>();

  // Generate public URL
  const generatePublicUrl = (bucket: string, objectName: string): string | null => {
    if (!preferences.publicUrlBase) {
      return null;
    }

    // Remove trailing slash if present
    const baseUrl = preferences.publicUrlBase.endsWith("/")
      ? preferences.publicUrlBase.slice(0, -1)
      : preferences.publicUrlBase;

    // Check if URL already contains bucket
    if (baseUrl.includes(bucket)) {
      return `${baseUrl}/${objectName}`;
    } else {
      return `${baseUrl}/${bucket}/${objectName}`;
    }
  };

  // Download text file content
  const downloadTextContent = async (url: string): Promise<string | undefined> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (err) {
      console.error("Error fetching text content:", err);
      return undefined;
    }
  };

  useEffect(() => {
    async function loadPreview() {
      setIsLoading(true);
      try {
        const ext = path.extname(objectName).toLowerCase();
        const publicUrl = generatePublicUrl(bucket, objectName) || "";
        const fileName = path.basename(objectName);

        let fileType = "Unknown";
        if (IMAGE_EXTENSIONS.includes(ext)) {
          fileType = `Image (${ext.substring(1)})`;
        } else if (AUDIO_EXTENSIONS.includes(ext)) {
          fileType = `Audio (${ext.substring(1)})`;
        } else if (VIDEO_EXTENSIONS.includes(ext)) {
          fileType = `Video (${ext.substring(1)})`;
        } else if (TEXT_EXTENSIONS.includes(ext)) {
          fileType = `Text (${ext.substring(1)})`;
        } else {
          fileType = `File (${ext.substring(1)})`;
        }

        // For text files, try to get content directly from URL
        let textContent: string | undefined = undefined;
        if (TEXT_EXTENSIONS.includes(ext) && publicUrl) {
          textContent = await downloadTextContent(publicUrl);
        }

        setPreviewData({
          url: publicUrl,
          fileName: fileName,
          fileSize: objectSize,
          bucket: bucket,
          objectName: objectName,
          fileType: fileType,
          textContent: textContent,
        });
      } catch (error) {
        console.error("Error preparing preview:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreview();
  }, [objectName, objectSize, bucket]);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading preview..." />;
  }

  if (!previewData) {
    return <Detail markdown="Unable to load preview content" />;
  }

  return (
    <FilePreviewDetail
      url={previewData.url}
      fileName={previewData.fileName}
      fileSize={previewData.fileSize}
      bucket={previewData.bucket}
      objectName={previewData.objectName}
      fileType={previewData.fileType}
      textContent={previewData.textContent}
    />
  );
}
