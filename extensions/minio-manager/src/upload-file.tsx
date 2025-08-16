import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  LaunchProps,
  getSelectedFinderItems,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import * as Minio from "minio";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

// Convert fs.access to a Promise-based version
const accessAsync = promisify(fs.access);

// File size limit constant (1GB)
const MAX_FILE_SIZE = 1024 * 1024 * 1024;

interface Preferences {
  endpoint: string;
  port: string;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
  defaultBucket: string;
  publicUrlBase?: string;
  autoCopyUrl?: boolean;
}

interface CommandArguments {
  file?: string;
}

type FormValues = {
  bucket: string;
  file: string | string[]; // Type definition can be string or string array
  prefix: string;
};

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { file: fileArgument } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const [isUploading, setIsUploading] = useState(false);
  const [useSSL, setUseSSL] = useState(preferences.useSSL);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

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

  // Toggle SSL mode
  const toggleSSL = () => {
    const newSSLMode = !useSSL;
    setUseSSL(newSSLMode);
    showToast({
      style: Toast.Style.Success,
      title: newSSLMode ? "SSL Enabled" : "SSL Disabled",
    });
  };

  // Handle file selection change
  const handleFileChange = (files: string[]) => {
    console.debug("File selection changed:", files);
    setSelectedFiles(files);
    // Clear previous URL
    setUploadedFileUrl(null);
  };

  // Get file path string
  const getFilePath = (fileValue: string | string[]): string => {
    if (Array.isArray(fileValue)) {
      // If it's an array, take the first element
      return fileValue.length > 0 ? fileValue[0] : "";
    }
    return fileValue;
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

  // Copy URL to clipboard
  const copyUrlToClipboard = async (url: string, showNotification: boolean = true) => {
    await Clipboard.copy(url);

    if (showNotification) {
      await showToast({
        style: Toast.Style.Success,
        title: "URL Copied",
        message: "File URL copied to clipboard",
      });
    }

    return true;
  };

  // Check file permissions
  async function checkFilePermission(filePath: string): Promise<{ hasPermission: boolean; error?: string }> {
    try {
      // First, check if the file exists
      if (!fs.existsSync(filePath)) {
        return {
          hasPermission: false,
          error: `File does not exist: ${filePath}`,
        };
      }

      // Check read permission
      await accessAsync(filePath, fs.constants.R_OK);

      // Get file stats to display more information
      const stats = fs.statSync(filePath);
      console.debug("File stats:", {
        path: filePath,
        size: stats.size,
        mode: stats.mode.toString(8), // Permission mode (octal)
        uid: stats.uid,
        gid: stats.gid,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        isSymbolicLink: stats.isSymbolicLink(),
      });

      // Check if file size exceeds limit
      if (stats.size > MAX_FILE_SIZE) {
        return {
          hasPermission: false,
          error: `File is too large (${(stats.size / 1024 / 1024 / 1024).toFixed(2)} GB). Maximum allowed size is 1 GB.`,
        };
      }

      return { hasPermission: true };
    } catch (error) {
      console.error("Permission error:", error);

      // Return different error messages based on error code
      if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;

        if (nodeError.code === "EACCES") {
          return {
            hasPermission: false,
            error: `Permission denied for file: ${filePath}`,
          };
        } else if (nodeError.code === "EPERM") {
          return {
            hasPermission: false,
            error: `Operation not permitted for file: ${filePath}`,
          };
        } else {
          return {
            hasPermission: false,
            error: `Error accessing file: ${nodeError.message}`,
          };
        }
      }

      return {
        hasPermission: false,
        error: `Unknown error accessing file: ${String(error)}`,
      };
    }
  }

  // Handle file upload
  async function handleSubmit(values: FormValues) {
    try {
      console.debug("Submitting form with values:", values);
      setIsUploading(true);
      // Clear previous URL
      setUploadedFileUrl(null);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Uploading file",
      });

      // Get file path string
      const filePath = getFilePath(values.file);
      console.debug("Extracted file path:", filePath);

      // Validate if file exists and has permissions
      console.debug("Checking if file exists:", filePath);
      if (!filePath) {
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = "No file selected";
        setIsUploading(false);
        return;
      }

      // Check file permissions
      const permissionCheck = await checkFilePermission(filePath);
      if (!permissionCheck.hasPermission) {
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = permissionCheck.error || "File access error";
        console.error(permissionCheck.error);
        setIsUploading(false);
        return;
      }

      const minioClient = getMinioClient();
      const bucket = values.bucket || preferences.defaultBucket;
      const fileName = path.basename(filePath);
      const objectName = values.prefix ? `${values.prefix}/${fileName}` : fileName;

      console.debug("Uploading file:", {
        file: filePath,
        bucket: bucket,
        objectName: objectName,
      });

      try {
        // Check if bucket exists, create if not
        const bucketExists = await minioClient.bucketExists(bucket);
        if (!bucketExists) {
          console.debug(`Bucket ${bucket} does not exist, creating it...`);
          await minioClient.makeBucket(bucket, "us-east-1");
        }

        // Upload file
        await minioClient.fPutObject(bucket, objectName, filePath, {});

        // Generate public URL
        const publicUrl = generatePublicUrl(bucket, objectName);
        if (publicUrl) {
          setUploadedFileUrl(publicUrl);

          // If autoCopyUrl is set, copy to clipboard
          if (preferences.autoCopyUrl) {
            await copyUrlToClipboard(publicUrl, false);
            toast.style = Toast.Style.Success;
            toast.title = "Upload successful";
            toast.message = `File uploaded and URL copied to clipboard`;
          } else {
            toast.style = Toast.Style.Success;
            toast.title = "Upload successful";
            toast.message = `File uploaded and URL generated`;
          }
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Upload successful";
          toast.message = `File uploaded to ${bucket}/${objectName}`;
        }

        console.debug("Upload successful:", {
          bucket: bucket,
          objectName: objectName,
          publicUrl: publicUrl || "No public URL configured",
          autoCopied: publicUrl && preferences.autoCopyUrl ? "Yes" : "No",
        });
      } catch (err) {
        console.error("Upload error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Check for SSL connection error
        if (
          useSSL &&
          (errorMessage.includes("TLS connection") ||
            errorMessage.includes("ECONNRESET") ||
            errorMessage.includes("certificate"))
        ) {
          // Prompt user to try disabling SSL
          toast.style = Toast.Style.Failure;
          toast.title = "SSL Connection Error";
          toast.message = "Try disabling SSL in the options";
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Upload failed";
          toast.message = errorMessage;
        }
      }
    } catch (error) {
      console.error("General error:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Upload failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsUploading(false);
    }
  }

  // Get selected files from Finder or command arguments
  useEffect(() => {
    async function getFinderSelection() {
      try {
        console.debug("Trying to get Finder selection...");
        // Attempt to get selected files from Finder
        const finderItems = await getSelectedFinderItems();
        console.debug("Finder items:", finderItems);

        if (finderItems.length > 0) {
          // Use the first selected file
          const filePath = finderItems[0].path;
          console.debug("Selected file from Finder:", filePath);

          // Validate file permissions
          const permissionCheck = await checkFilePermission(filePath);
          if (permissionCheck.hasPermission) {
            setSelectedFiles([filePath]);
          } else {
            console.error(permissionCheck.error);
            await showToast({
              style: Toast.Style.Failure,
              title: "File access error",
              message: permissionCheck.error,
            });
          }
        } else if (fileArgument) {
          // If no Finder selection, but command argument exists
          console.debug("No Finder selection, trying file argument:", fileArgument);

          // Validate file permissions
          const permissionCheck = await checkFilePermission(fileArgument);
          if (permissionCheck.hasPermission) {
            console.debug("File argument exists and is accessible, using it");
            setSelectedFiles([fileArgument]);
          } else {
            console.error(permissionCheck.error);
            await showToast({
              style: Toast.Style.Failure,
              title: "File access error",
              message: permissionCheck.error,
            });
          }
        } else {
          console.debug("No file selected from Finder and no file argument provided");
        }
      } catch (error) {
        console.error("Error getting Finder selection:", error);
        // If getting Finder selection fails (e.g., Finder is not the frontmost app), fallback to command argument
        if (fileArgument) {
          console.debug("Falling back to file argument:", fileArgument);

          // Validate file permissions
          const permissionCheck = await checkFilePermission(fileArgument);
          if (permissionCheck.hasPermission) {
            setSelectedFiles([fileArgument]);
          } else {
            console.error(permissionCheck.error);
            await showToast({
              style: Toast.Style.Failure,
              title: "File access error",
              message: permissionCheck.error,
            });
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    getFinderSelection();
  }, [fileArgument]);

  return (
    <Form
      isLoading={isLoading || isUploading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Upload} title="Upload File" />
          {uploadedFileUrl && (
            <Action title="Copy File URL" icon={Icon.Link} onAction={() => copyUrlToClipboard(uploadedFileUrl)} />
          )}
          {uploadedFileUrl && <Action.OpenInBrowser title="Open in Browser" url={uploadedFileUrl} />}
          <Action
            title={useSSL ? "Disable Ssl" : "Enable Ssl"}
            icon={useSSL ? Icon.Lock : Icon.LockUnlocked}
            onAction={toggleSSL}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Upload a file to your MinIO server." />

      <Form.TextField
        id="bucket"
        title="Bucket"
        placeholder={preferences.defaultBucket}
        info={`Leave empty to use default bucket (${preferences.defaultBucket})`}
      />

      <Form.FilePicker
        id="file"
        title="File"
        allowMultipleSelection={false}
        value={selectedFiles}
        onChange={handleFileChange}
      />

      <Form.TextField
        id="prefix"
        title="Prefix (Optional)"
        placeholder="folder/subfolder"
        info="Optional folder path prefix for the uploaded file"
      />

      <Form.Separator />

      <Form.Description
        title="Connection Info"
        text={`Endpoint: ${preferences.endpoint}\nDefault Bucket: ${preferences.defaultBucket}\nSSL: ${useSSL ? "Enabled" : "Disabled"}`}
      />

      {selectedFiles.length > 0 && (
        <Form.Description
          title="Selected File"
          text={`Path: ${selectedFiles[0]}\nExists: ${fs.existsSync(selectedFiles[0]) ? "Yes" : "No"}`}
        />
      )}

      {uploadedFileUrl && <Form.Description title="File URL" text={uploadedFileUrl} />}
    </Form>
  );
}
