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
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import * as Minio from "minio";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import http from "http";
import https from "https";

// Convert fs.access to a Promise-based version
const accessAsync = promisify(fs.access);

interface Preferences {
  endpoint: string;
  port: string;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
  defaultBucket: string;
  publicUrlBase?: string;
  autoCopyUrl?: boolean;
  // Upload configuration
  maxFileSize: string; // in MB
  partSize: string; // in MB
  concurrency: string;
  retryCount: string; // Number of retries for failed parts
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

  // Ref for cancellation control
  const uploadCancelledRef = useRef(false);
  const activeRequestsRef = useRef<http.ClientRequest[]>([]);

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
      const maxFileSize = parseInt(preferences.maxFileSize || "1024") * 1024 * 1024;
      if (stats.size > maxFileSize) {
        const maxSizeDisplay =
          parseInt(preferences.maxFileSize || "1024") >= 1024
            ? `${(parseInt(preferences.maxFileSize || "1024") / 1024).toFixed(1)} GB`
            : `${preferences.maxFileSize || "1024"} MB`;
        return {
          hasPermission: false,
          error: `File is too large (${(stats.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${maxSizeDisplay}.`,
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
        message: "0%",
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

        // Get file size for progress tracking
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;

        // Parse upload configuration from preferences
        const partSize = Math.max(5, parseInt(preferences.partSize || "5")) * 1024 * 1024; // Minimum 5MB
        const concurrency = Math.max(1, parseInt(preferences.concurrency || "4"));
        const maxRetries = Math.max(0, parseInt(preferences.retryCount || "3"));

        // Reset cancellation state
        uploadCancelledRef.current = false;
        activeRequestsRef.current = [];

        // For small files (< partSize), use simple upload
        if (fileSize < partSize) {
          toast.message = "Uploading...";
          await minioClient.fPutObject(bucket, objectName, filePath, {});
        } else {
          // For large files, use concurrent multipart upload
          const fileBuffer = fs.readFileSync(filePath);
          const totalParts = Math.ceil(fileSize / partSize);

          // Track progress for each part
          const partProgress: number[] = new Array(totalParts).fill(0);

          const updateTotalProgress = () => {
            const totalUploaded = partProgress.reduce((sum, p) => sum + p, 0);
            const percentage = Math.round((totalUploaded / fileSize) * 100);
            const uploadedMB = (totalUploaded / 1024 / 1024).toFixed(1);
            const totalMB = (fileSize / 1024 / 1024).toFixed(1);
            toast.message = `${percentage}% (${uploadedMB}/${totalMB} MB)`;
          };

          // Initialize multipart upload
          const uploadId = await minioClient.initiateNewMultipartUpload(bucket, objectName, {});

          // Prepare parts
          interface PartInfo {
            partNumber: number;
            start: number;
            end: number;
          }

          const parts: PartInfo[] = [];
          for (let i = 0; i < totalParts; i++) {
            const start = i * partSize;
            const end = Math.min(start + partSize, fileSize);
            parts.push({ partNumber: i + 1, start, end });
          }

          // Upload a single part with progress tracking
          const uploadPart = async (part: PartInfo): Promise<{ part: number; etag: string }> => {
            // Check if upload was cancelled
            if (uploadCancelledRef.current) {
              throw new Error("Upload cancelled");
            }

            const partBuffer = fileBuffer.subarray(part.start, part.end);
            const partSize = part.end - part.start;

            // Get presigned URL for this part
            const presignedUrl = await minioClient.presignedUrl("PUT", bucket, objectName, 60 * 60, {
              partNumber: String(part.partNumber),
              uploadId: uploadId,
            });

            return new Promise((resolve, reject) => {
              // Check cancellation before starting request
              if (uploadCancelledRef.current) {
                reject(new Error("Upload cancelled"));
                return;
              }

              const url = new URL(presignedUrl);
              const protocol = url.protocol === "https:" ? https : http;

              const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === "https:" ? 443 : 80),
                path: url.pathname + url.search,
                method: "PUT",
                headers: {
                  "Content-Length": partSize,
                },
              };

              const req = protocol.request(options, (res) => {
                // Remove from active requests
                activeRequestsRef.current = activeRequestsRef.current.filter((r) => r !== req);

                const etag = res.headers.etag?.replace(/"/g, "") || "";
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                  resolve({ part: part.partNumber, etag });
                } else {
                  reject(new Error(`Part ${part.partNumber} upload failed with status ${res.statusCode}`));
                }
              });

              // Track active request for cancellation
              activeRequestsRef.current.push(req);

              req.on("error", (err) => {
                activeRequestsRef.current = activeRequestsRef.current.filter((r) => r !== req);
                reject(err);
              });

              // Track upload progress for this part
              let uploaded = 0;
              const chunkSize = 64 * 1024;

              const writeChunk = () => {
                // Check cancellation during upload
                if (uploadCancelledRef.current) {
                  req.destroy();
                  reject(new Error("Upload cancelled"));
                  return;
                }

                let canContinue = true;
                while (canContinue && uploaded < partSize) {
                  const end = Math.min(uploaded + chunkSize, partSize);
                  const chunk = partBuffer.subarray(uploaded, end);
                  canContinue = req.write(chunk);
                  uploaded = end;

                  // Update this part's progress
                  partProgress[part.partNumber - 1] = uploaded;
                  updateTotalProgress();
                }

                if (uploaded >= partSize) {
                  req.end();
                }
              };

              req.on("drain", writeChunk);
              writeChunk();
            });
          };

          // Upload a single part with retry logic
          const uploadPartWithRetry = async (
            part: PartInfo,
            retriesLeft: number = maxRetries,
          ): Promise<{ part: number; etag: string }> => {
            try {
              return await uploadPart(part);
            } catch (error) {
              // Don't retry if cancelled
              if (uploadCancelledRef.current || (error instanceof Error && error.message === "Upload cancelled")) {
                throw error;
              }

              if (retriesLeft > 0) {
                console.debug(`Part ${part.partNumber} failed, retrying... (${retriesLeft} retries left)`);
                // Reset progress for this part before retry
                partProgress[part.partNumber - 1] = 0;
                updateTotalProgress();
                // Wait a bit before retrying (exponential backoff)
                await new Promise((resolve) => setTimeout(resolve, (maxRetries - retriesLeft + 1) * 1000));
                return uploadPartWithRetry(part, retriesLeft - 1);
              }
              throw error;
            }
          };

          // Concurrent upload with limited concurrency
          const uploadedParts: { part: number; etag: string }[] = [];
          const queue = [...parts];
          let uploadError: Error | null = null;

          const worker = async () => {
            while (queue.length > 0 && !uploadCancelledRef.current && !uploadError) {
              const part = queue.shift();
              if (part) {
                try {
                  const result = await uploadPartWithRetry(part);
                  uploadedParts.push(result);
                } catch (err) {
                  if (err instanceof Error && err.message === "Upload cancelled") {
                    throw err;
                  }
                  uploadError = err instanceof Error ? err : new Error(String(err));
                  throw uploadError;
                }
              }
            }
          };

          // Function to run upload workers
          const runUploadWorkers = async (): Promise<boolean> => {
            // Reset error state for retry
            uploadError = null;

            // Start concurrent workers (at least 1, but not more than remaining parts)
            const workerCount = Math.min(concurrency, Math.max(queue.length, 1));
            const workers: Promise<void>[] = [];

            for (let i = 0; i < workerCount; i++) {
              workers.push(worker());
            }

            try {
              await Promise.all(workers);
              return !uploadError && queue.length === 0;
            } catch (err) {
              console.debug("Worker error caught:", err);
              // Check if cancelled
              if (uploadCancelledRef.current || (err instanceof Error && err.message === "Upload cancelled")) {
                return false;
              }
              return false;
            }
          };

          // Initial upload attempt
          let uploadSuccess = await runUploadWorkers();

          // Handle failures with user choice
          while (!uploadSuccess && !uploadCancelledRef.current) {
            // Calculate failed parts
            const completedPartNumbers = new Set(uploadedParts.map((p) => p.part));
            const failedParts = parts.filter((p) => !completedPartNumbers.has(p.partNumber));
            const failedPartsCount = failedParts.length;
            const completedPartsCount = uploadedParts.length;

            // If no parts failed, we're done
            if (failedPartsCount === 0) {
              uploadSuccess = true;
              break;
            }

            // Ask user what to do
            let shouldRetry = false;
            try {
              shouldRetry = await confirmAlert({
                title: "Upload Failed",
                message: `${completedPartsCount}/${totalParts} parts uploaded successfully. ${failedPartsCount} part(s) failed.\n\nDo you want to retry the failed parts?`,
                primaryAction: {
                  title: "Retry Failed Parts",
                  style: Alert.ActionStyle.Default,
                },
                dismissAction: {
                  title: "Abort Upload",
                  style: Alert.ActionStyle.Destructive,
                },
              });
            } catch (alertErr) {
              console.error("Alert error:", alertErr);
              shouldRetry = false;
            }

            if (!shouldRetry) {
              // User chose to abort
              try {
                console.debug("User chose to abort, cleaning up multipart upload...");
                await minioClient.abortMultipartUpload(bucket, objectName, uploadId);
              } catch (abortErr) {
                console.error("Failed to abort multipart upload:", abortErr);
              }
              throw new Error("Upload aborted by user");
            }

            // User chose to retry - rebuild queue with failed parts only
            queue.length = 0;
            queue.push(...failedParts);

            // Reset progress for failed parts
            failedParts.forEach((p) => {
              partProgress[p.partNumber - 1] = 0;
            });
            updateTotalProgress();

            toast.style = Toast.Style.Animated;
            toast.title = "Retrying failed parts";

            // Retry upload
            uploadSuccess = await runUploadWorkers();
          }

          // Check if upload was cancelled
          if (uploadCancelledRef.current) {
            try {
              await minioClient.abortMultipartUpload(bucket, objectName, uploadId);
            } catch (abortErr) {
              console.error("Failed to abort multipart upload:", abortErr);
            }
            throw new Error("Upload cancelled");
          }

          // Sort parts by part number and complete multipart upload
          uploadedParts.sort((a, b) => a.part - b.part);

          await minioClient.completeMultipartUpload(bucket, objectName, uploadId, uploadedParts);
        }

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
        const errorCode = err instanceof Error && "code" in err ? (err as NodeJS.ErrnoException).code : "";

        // Check for network/connection errors
        const isNetworkError =
          errorCode === "ECONNRESET" ||
          errorCode === "ECONNREFUSED" ||
          errorCode === "ETIMEDOUT" ||
          errorCode === "ENOTFOUND" ||
          errorMessage.includes("socket hang up") ||
          errorMessage.includes("network") ||
          errorMessage.includes("ECONNRESET");

        // Check for SSL connection error
        const isSSLError =
          useSSL &&
          (errorMessage.includes("TLS connection") ||
            errorMessage.includes("certificate") ||
            errorMessage.includes("SSL"));

        if (isSSLError) {
          toast.style = Toast.Style.Failure;
          toast.title = "SSL Connection Error";
          toast.message = "Try disabling SSL in the options";
        } else if (isNetworkError) {
          toast.style = Toast.Style.Failure;
          toast.title = "Network Error";
          toast.message = "Connection lost. Please check your network and try again.";
        } else if (errorMessage === "Upload cancelled" || errorMessage === "Upload aborted by user") {
          toast.style = Toast.Style.Failure;
          toast.title = "Upload Cancelled";
          toast.message = "The upload was cancelled";
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

  // Cancel ongoing upload
  const cancelUpload = () => {
    uploadCancelledRef.current = true;

    // Abort all active HTTP requests
    activeRequestsRef.current.forEach((req) => {
      try {
        req.destroy();
      } catch (e) {
        console.error("Error destroying request:", e);
      }
    });
    activeRequestsRef.current = [];
  };

  return (
    <Form
      isLoading={isLoading || isUploading}
      actions={
        <ActionPanel>
          {isUploading ? (
            <Action
              title="Cancel Upload"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={cancelUpload}
            />
          ) : (
            <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Upload} title="Upload File" />
          )}
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
