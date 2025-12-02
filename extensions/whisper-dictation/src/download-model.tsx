import {
  List,
  ActionPanel,
  Action,
  environment,
  showToast,
  Toast,
  LocalStorage,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import { showFailureToast, useCachedState } from "@raycast/utils";

interface WhisperModel {
  key: string;
  name: string;
  filename: string;
  url: string;
  size?: string;
}

const models: WhisperModel[] = [
  {
    key: "tiny.en",
    name: "Tiny English",
    filename: "ggml-tiny.en.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin?download=true",
    size: "78 MB",
  },
  {
    key: "base.en",
    name: "Base English",
    filename: "ggml-base.en.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin?download=true",
    size: "148 MB",
  },
  {
    key: "small.en",
    name: "Small English",
    filename: "ggml-small.en.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin?download=true",
    size: "488 MB",
  },
  {
    key: "medium.en",
    name: "Medium English",
    filename: "ggml-medium.en.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin?download=true",
    size: "1.53 GB",
  },
  {
    key: "tiny",
    name: "Tiny Multilingual",
    filename: "ggml-tiny.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin?download=true",
    size: "78 MB",
  },
  {
    key: "base",
    name: "Base Multilingual",
    filename: "ggml-base.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin?download=true",
    size: "148 MB",
  },
  {
    key: "small",
    name: "Small Multilingual",
    filename: "ggml-small.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin?download=true",
    size: "488 MB",
  },
  {
    key: "medium",
    name: "Medium Multilingual",
    filename: "ggml-medium.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin?download=true",
    size: "1.53 GB",
  },
  {
    key: "turbo",
    name: "Turbo Multilingual",
    filename: "ggml-large-v3-turbo.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin?download=true",
    size: "1.62 GB",
  },
  {
    key: "large",
    name: "Large Multilingual",
    filename: "ggml-large-v3.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin?download=true",
    size: "3.1 GB",
  },
];

const DOWNLOADED_MODEL_PATH_KEY = "downloadedModelPath";
const MODEL_DIR = path.join(environment.supportPath, "models");
const MIN_MODEL_SIZE = 77000000; // Minimum size for a model to be considered valid (77 MB)

function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(MB|GB)$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2];

  if (unit === "MB") {
    return value * 1024 * 1024;
  } else if (unit === "GB") {
    return value * 1024 * 1024 * 1024;
  }

  return 0;
}

async function checkModelExists(filename: string): Promise<boolean> {
  const filePath = path.join(MODEL_DIR, filename);
  try {
    const stats = await fs.promises.stat(filePath);

    // Find model with matching filename
    const model = models.find((m) => m.filename === filename);
    if (!model || !model.size) {
      // Fallback to basic check if model not found or no size info
      return stats.size >= MIN_MODEL_SIZE;
    }

    const expectedSize = parseSize(model.size);
    if (expectedSize === 0) {
      // Fallback to basic size check if size parsing failed
      return stats.size >= MIN_MODEL_SIZE;
    }

    // Allow 10% tolerance for size variation
    const minSize = expectedSize * 0.9;
    const maxSize = expectedSize * 1.1;

    return stats.size >= minSize && stats.size <= maxSize;
  } catch {
    return false;
  }
}

export default function DownloadModelCommand() {
  const [isLoading, setIsLoading] = useState<string | false>(false);
  const [downloadedModels, setDownloadedModels] = useCachedState<Record<string, boolean>>("downloadedModelsState", {});
  const [activeModelPath, setActiveModelPath] = useState<string | null>(null);

  // Check existing models on mount
  useEffect(() => {
    let isMounted = true;
    LocalStorage.getItem<string>(DOWNLOADED_MODEL_PATH_KEY).then((storedPath) => {
      if (isMounted && storedPath) {
        // Check if stored path actually exists before setting
        fs.promises
          .access(storedPath)
          .then(() => {
            if (isMounted) setActiveModelPath(storedPath);
            console.log("Loaded and verified active model path:", storedPath);
          })
          .catch(() => {
            console.log("Stored active model path not found, clearing LocalStorage.");
            LocalStorage.removeItem(DOWNLOADED_MODEL_PATH_KEY);
          });
      } else if (isMounted) {
        console.log("No active model path found in LocalStorage.");
      }
    });
    return () => {
      isMounted = false;
    };
  }, []); // Run only once on mount

  // Check downloaded models on mount
  useEffect(() => {
    async function checkExisting() {
      if (!fs.existsSync(MODEL_DIR)) {
        fs.mkdirSync(MODEL_DIR, { recursive: true });
        console.log("Created model directory:", MODEL_DIR);
        return; // No models exist if dir was just created
      }

      console.log("Checking existing models in:", MODEL_DIR);

      // Clean up any leftover temp files from interrupted downloads
      try {
        const files = await fs.promises.readdir(MODEL_DIR);
        const tempFiles = files.filter((file) => file.endsWith(".tmp"));
        for (const tempFile of tempFiles) {
          try {
            await fs.promises.unlink(path.join(MODEL_DIR, tempFile));
            console.log(`Cleaned up temp file: ${tempFile}`);
          } catch (err) {
            console.log(`Could not clean up temp file ${tempFile}:`, err);
          }
        }
      } catch (err) {
        console.log("Could not check for temp files:", err);
      }

      const updatedStatus: Record<string, boolean> = {};
      let changed = false;
      for (const model of models) {
        const exists = await checkModelExists(model.filename);
        if (exists !== downloadedModels[model.key]) {
          console.log(`Model ${model.key} exists: ${exists} (previously ${downloadedModels[model.key]})`);
          changed = true;
        }
        updatedStatus[model.key] = exists;
      }
      if (changed) {
        console.log("Updating downloaded models state.");
        setDownloadedModels(updatedStatus);
      } else {
        console.log("No changes in downloaded models state.");
      }
    }
    checkExisting();
  }, [setDownloadedModels]);

  async function downloadModel(model: WhisperModel) {
    setIsLoading(model.key); // Shows which model is loading
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${model.name}...`,
      message: `Starting download for ${model.filename}`,
    });

    const destinationPath = path.join(MODEL_DIR, model.filename);
    const tempPath = `${destinationPath}.tmp`;
    console.log(`Starting download for ${model.name} to ${tempPath}`);

    try {
      // Ensure support directory exists
      if (!fs.existsSync(MODEL_DIR)) {
        console.log("Creating model directory:", MODEL_DIR);
        fs.mkdirSync(MODEL_DIR, { recursive: true });
      }

      // Clean up any existing temp file first
      try {
        await fs.promises.unlink(tempPath);
        console.log("Removed existing temp file");
      } catch (cleanupError: unknown) {
        // Ignore if file doesn't exist
        const err = cleanupError as NodeJS.ErrnoException;
        if (err.code !== "ENOENT") {
          console.log("Warning: Could not clean up existing temp file:", err);
        }
      }

      // Download using Node https and fs streams to temp file
      const fileStream = fs.createWriteStream(tempPath);
      console.log(`Created write stream for ${tempPath}`);

      await new Promise<void>((resolve, reject) => {
        let isResolved = false;

        const cleanup = () => {
          if (!isResolved) {
            fileStream.destroy();
            fs.unlink(tempPath, (unlinkErr) => {
              if (unlinkErr && unlinkErr.code !== "ENOENT") {
                console.error("Error deleting temp file during cleanup:", unlinkErr);
              } else {
                console.log("Successfully deleted temp file during cleanup.");
              }
            });
          }
        };

        const request = (url: string, redirectCount = 0) => {
          if (redirectCount > 5) {
            cleanup();
            reject(new Error("Too many redirects"));
            return;
          }
          console.log(`Making HTTPS GET request to: ${url}`);
          const req = https
            .get(url, (response) => {
              console.log(`Response status code: ${response.statusCode}`);
              console.log("Response headers:", response.headers);

              // Handle redirects
              if (
                response.statusCode &&
                response.statusCode >= 301 &&
                response.statusCode <= 307 &&
                response.headers.location
              ) {
                console.log(`Redirecting to ${response.headers.location}`);
                response.destroy();
                request(response.headers.location, redirectCount + 1);
                return;
              }

              // Check successful status code
              if (response.statusCode !== 200) {
                const errorMsg = `Download failed: Server responded with status ${response.statusCode}`;
                console.error(errorMsg);
                cleanup();
                reject(new Error(errorMsg));
                return;
              }

              const contentLength = parseInt(response.headers["content-length"] || "0", 10);
              console.log(`Content-Length: ${contentLength}`);

              console.log("Piping response to file stream...");
              response.pipe(fileStream);

              // Success: Listen for 'finish' on file stream
              fileStream.on("finish", () => {
                console.log(`File stream finished writing for ${model.filename}. Closing stream.`);
                fileStream.close((closeErr) => {
                  if (closeErr) {
                    console.error(`Error closing file stream for ${model.filename}:`, closeErr);
                    cleanup();
                    reject(closeErr);
                  } else {
                    try {
                      const stats = fs.statSync(tempPath);
                      console.log(`Downloaded file size: ${stats.size}`);
                      if (contentLength > 0 && stats.size !== contentLength) {
                        const errorMsg = `Downloaded file size (${stats.size}) does not match content-length (${contentLength})`;
                        console.error(errorMsg);
                        cleanup();
                        reject(new Error(errorMsg));
                        return;
                      }
                      console.log(`File stream closed successfully for ${model.filename}. Resolving promise.`);
                      isResolved = true;
                      resolve();
                    } catch (statErr) {
                      console.error(`Error getting file stats for ${tempPath}:`, statErr);
                      cleanup();
                      reject(statErr);
                    }
                  }
                });
              });

              // Listen for 'error' on both response and file stream
              fileStream.on("error", (err) => {
                console.error(`File stream error for ${model.filename}:`, err);
                cleanup();
                reject(err);
              });

              response.on("error", (err) => {
                console.error(`Response stream error during download for ${model.filename}:`, err);
                cleanup();
                reject(err);
              });
            })
            .on("error", (err) => {
              console.error(`HTTPS request error for ${model.url}:`, err);
              cleanup();
              reject(err);
            });

          // Handle potential request timeout or interruption
          req.setTimeout(300000, () => {
            console.error(`Request timeout for ${model.url}`);
            req.destroy();
            cleanup();
            reject(new Error("Download request timed out"));
          });
        };

        request(model.url);
      });

      // Verify the downloaded file is complete and move from temp to final location
      console.log(`Verifying and moving file from ${tempPath} to ${destinationPath}`);

      // Check if temp file exists and has reasonable size
      const tempStats = await fs.promises.stat(tempPath);
      if (tempStats.size < 1000) {
        // Model files should be at least 1KB
        throw new Error(`Downloaded file is too small (${tempStats.size} bytes), likely corrupted`);
      }

      // Move temp file to final location atomically
      await fs.promises.rename(tempPath, destinationPath);
      console.log(`Successfully moved temp file to final location`);

      // Store path in LocalStorage
      console.log(`Download promise resolved. Saving path to LocalStorage: ${destinationPath}`);
      await LocalStorage.setItem(DOWNLOADED_MODEL_PATH_KEY, destinationPath);
      console.log(`Successfully saved path to LocalStorage.`);
      setActiveModelPath(destinationPath);

      // Update downloaded status state
      setDownloadedModels((prev) => ({ ...prev, [model.key]: true }));

      // Update Toast for Success
      toast.style = Toast.Style.Success;
      toast.title = "Download Complete!";
      toast.message = `${model.name} saved successfully.`;
      console.log(`Download complete for ${model.name}.`);
    } catch (error: unknown) {
      console.error(`Download failed for ${model.name}:`, error);

      // Clean up both temp and final files on any error
      try {
        await fs.promises.unlink(tempPath);
        console.log("Deleted temp file after error.");
      } catch (cleanupError: unknown) {
        const err = cleanupError as NodeJS.ErrnoException;
        if (err.code !== "ENOENT") {
          console.error("Error deleting temp file after error:", err);
        }
      }

      try {
        await fs.promises.unlink(destinationPath);
        console.log("Deleted partial final file after error.");
      } catch (cleanupError: unknown) {
        const err = cleanupError as NodeJS.ErrnoException;
        if (err.code !== "ENOENT") {
          console.error("Error deleting partial final file after error:", err);
        }
      }

      // Update downloaded status state to false on failure
      setDownloadedModels((prev) => ({ ...prev, [model.key]: false }));
      await showFailureToast(error instanceof Error ? error.message : String(error), {
        title: `Failed to Download ${model.name}`,
      });
    } finally {
      console.log(`Finishing download attempt for ${model.name}. Setting loading state to false.`);
      setIsLoading(false);
    }
  }

  async function deleteModel(model: WhisperModel) {
    const filePath = path.join(MODEL_DIR, model.filename);
    if (
      await confirmAlert({
        title: `Delete ${model.name}?`,
        message: `Are you sure you want to delete the model file "${model.filename}"? This cannot be undone.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(model.key);
      const toast = await showToast(Toast.Style.Animated, "Deleting model...");
      try {
        console.log("Attempting to delete model:", filePath);
        await fs.promises.unlink(filePath);
        console.log("Model deleted successfully:", filePath);

        // Update downloaded models state first
        const updatedDownloadedModels = { ...downloadedModels, [model.key]: false };
        setDownloadedModels(updatedDownloadedModels);

        // Check if deleted model was active
        const currentStoredPath = await LocalStorage.getItem<string>(DOWNLOADED_MODEL_PATH_KEY);
        if (currentStoredPath === filePath) {
          console.log("Clearing active model path from LocalStorage as it was deleted.");

          // Find the first available downloaded model to set as active
          const firstDownloadedModel = models.find(
            (m) => m.key !== model.key && updatedDownloadedModels[m.key] === true,
          );

          if (firstDownloadedModel) {
            const newActiveModelPath = path.join(MODEL_DIR, firstDownloadedModel.filename);
            console.log(`Setting new active model to: ${firstDownloadedModel.name} at ${newActiveModelPath}`);
            await LocalStorage.setItem(DOWNLOADED_MODEL_PATH_KEY, newActiveModelPath);
            setActiveModelPath(newActiveModelPath);

            // Update the toast message to inform user about the new active model
            toast.message = `${model.name} deleted successfully. ${firstDownloadedModel.name} is now the active model.`;
          } else {
            console.log("No other downloaded models available to set as active.");
            await LocalStorage.removeItem(DOWNLOADED_MODEL_PATH_KEY);
            setActiveModelPath(null);
            toast.message = `${model.name} deleted successfully. No active model selected.`;
          }
        } else {
          toast.message = `${model.name} deleted successfully.`;
        }
        toast.style = Toast.Style.Success;
        toast.title = "Model Deleted";
        // Message is already set above based on whether a new active model was selected
      } catch (error: unknown) {
        console.error(`Failed to delete model ${model.filename}:`, error);
        await showFailureToast(error instanceof Error ? error.message : String(error), {
          title: `Failed to Delete ${model.name}`,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log("User cancelled model deletion.");
    }
  }

  return (
    <List isLoading={isLoading !== false}>
      {models.map((model) => {
        const isDownloaded = downloadedModels[model.key] || false;
        //get model path and active status
        const modelPath = path.join(MODEL_DIR, model.filename);
        const isActive = isDownloaded && activeModelPath === modelPath;

        //build accessories
        const accessories = [];
        if (isActive) {
          // Add "Active" tag first if it's the active model
          accessories.push({ tag: { value: "Active", color: Icon.Checkmark }, tooltip: "Currently active model" });
        }
        if (isDownloaded) {
          // Add downloaded tag
          accessories.push({ tag: { value: "Downloaded", color: "green" }, tooltip: "Model is downloaded" });
        }
        // Always add filename
        accessories.push({ text: model.filename });

        // Is ANY operation running?
        const isAnyOperationLoading = isLoading !== false;

        return (
          <List.Item
            key={model.key}
            title={model.name}
            subtitle={model.size}
            accessories={accessories}
            actions={
              <ActionPanel>
                {!isDownloaded && !isAnyOperationLoading && (
                  <Action title={`Download ${model.name}`} onAction={() => downloadModel(model)} icon={Icon.Download} />
                )}
                {isDownloaded && !isAnyOperationLoading && (
                  <Action
                    title="Set as Active Model"
                    icon={Icon.Checkmark}
                    onAction={async () => {
                      console.log(`Setting active model path: ${modelPath}`);
                      await LocalStorage.setItem(DOWNLOADED_MODEL_PATH_KEY, modelPath);
                      setActiveModelPath(modelPath);
                      await showToast(
                        Toast.Style.Success,
                        "Active Model Set",
                        `${model.name} is now the active model.`,
                      );
                    }}
                  />
                )}
                {isDownloaded && !isAnyOperationLoading && (
                  <Action
                    title={`Delete ${model.name}`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteModel(model)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                )}
                {isDownloaded && !isAnyOperationLoading && (
                  <Action.ShowInFinder
                    path={modelPath} // Use calculated modelPath
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
