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

async function checkModelExists(filename: string): Promise<boolean> {
  const filePath = path.join(MODEL_DIR, filename);
  try {
    await fs.promises.access(filePath);
    return true;
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
    console.log(`Starting download for ${model.name} to ${destinationPath}`);

    try {
      // Ensure support directory exists
      if (!fs.existsSync(MODEL_DIR)) {
        console.log("Creating model directory:", MODEL_DIR);
        fs.mkdirSync(MODEL_DIR, { recursive: true });
      }

      // Download using Node https and fs streams
      const fileStream = fs.createWriteStream(destinationPath);
      console.log(`Created write stream for ${destinationPath}`);

      await new Promise<void>((resolve, reject) => {
        const request = (url: string, redirectCount = 0) => {
          if (redirectCount > 5) {
            throw new Error("Too many redirects");
          }
          console.log(`Making HTTPS GET request to: ${url}`);
          https
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
                //Close current response stream before new request
                response.destroy();
                request(response.headers.location, redirectCount + 1); // Track redirect count
                return;
              }

              // Check successful status code
              if (response.statusCode !== 200) {
                const errorMsg = `Download failed: Server responded with status ${response.statusCode}`;
                console.error(errorMsg);
                // Clean up partial file on non-200 status
                fileStream.close(() => {
                  fs.unlink(destinationPath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== "ENOENT") {
                      console.error("Error deleting partial file after status error:", unlinkErr);
                    } else {
                      console.log("Deleted partial file after status error.");
                    }
                    reject(new Error(errorMsg)); // Reject AFTER cleanup
                  });
                });
                return;
              }

              console.log("Piping response to file stream...");
              response.pipe(fileStream);

              // Success: Listen for 'finish' on file stream
              fileStream.on("finish", () => {
                console.log(`File stream finished writing for ${model.filename}. Closing stream.`);
                fileStream.close((closeErr) => {
                  // Ensure file descriptor closed
                  if (closeErr) {
                    console.error(`Error closing file stream for ${model.filename}:`, closeErr);
                    reject(closeErr); // Reject if closing fails
                  } else {
                    console.log(`File stream closed successfully for ${model.filename}. Resolving promise.`);
                    resolve(); // Resolve the promise ONLY after stream is closed
                  }
                });
              });

              // Listen for 'error' on both response and file stream
              fileStream.on("error", (err) => {
                console.error(`File stream error for ${model.filename}:`, err);
                fs.unlink(destinationPath, (unlinkErr) => {
                  if (unlinkErr && unlinkErr.code !== "ENOENT") {
                    console.error(`Error deleting partial file after stream error:`, unlinkErr);
                  } else {
                    console.log("Successfully deleted partial file after stream error.");
                  }
                });
                reject(err); // Reject promise on file stream error
              });

              response.on("error", (err) => {
                console.error(`Response stream error during download for ${model.filename}:`, err);
                fs.unlink(destinationPath, (unlinkErr) => {
                  if (unlinkErr && unlinkErr.code !== "ENOENT") {
                    console.error(`Error deleting partial file after response error:`, unlinkErr);
                  } else {
                    console.log("Successfully deleted partial file after response error.");
                  }
                });
                reject(err);
              });
            })
            .on("error", (err) => {
              console.error(`HTTPS request error for ${model.url}:`, err);
              fs.unlink(destinationPath, (unlinkErr) => {
                if (unlinkErr && unlinkErr.code !== "ENOENT") {
                  console.error(`Error deleting partial file after HTTPS error:`, unlinkErr);
                } else {
                  console.log("Successfully deleted partial file after HTTPS error.");
                }
              });
              reject(err);
            });
        };
        request(model.url); // Initial request
      });

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
      // Ensure partial file deleted on any error
      try {
        await fs.promises.unlink(destinationPath);
        console.log("Deleted partial file after caught error.");
      } catch (error: unknown) {
        // Ignore if file doesn't exist, log other errors
        const err = error as NodeJS.ErrnoException;
        if (err.code !== "ENOENT") {
          console.error("Error deleting partial file after caught error:", err);
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

        // Check if deleted model was active
        const currentStoredPath = await LocalStorage.getItem<string>(DOWNLOADED_MODEL_PATH_KEY);
        if (currentStoredPath === filePath) {
          console.log("Clearing active model path from LocalStorage as it was deleted.");
          await LocalStorage.removeItem(DOWNLOADED_MODEL_PATH_KEY);
          // Update state
          setActiveModelPath(null);
        }

        setDownloadedModels((prev) => ({ ...prev, [model.key]: false }));
        toast.style = Toast.Style.Success;
        toast.title = "Model Deleted";
        toast.message = `${model.name} deleted successfully.`;
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
