import React, { useState, useEffect } from "react"; // Added useMemo
import {
  ActionPanel,
  Action,
  Form,
  Clipboard,
  showToast,
  Toast,
  LocalStorage,
  useNavigation,
  Icon,
  environment, // <-- Import environment API
} from "@raycast/api";
import { PromptChunk } from "./types"; // Adjust path if needed
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises"; // To read config file and header files
import path from "path"; // To construct paths

const STORAGE_KEY = "promptChainChunks_v1"; // Must match the key used elsewhere
const CONFIG_FILE_NAME = "config.json"; // Name of your config file

// --- Helper Functions (Consider moving to a shared utils file) ---

async function loadChainFromStorage(): Promise<PromptChunk[]> {
  // console.log("[AddFormHelper] Loading chain from storage..."); // Keep logs for debugging if needed
  try {
    const storedChainJson = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (storedChainJson) {
      const parsed = JSON.parse(storedChainJson);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("[AddFormHelper] Failed to load or parse prompt chain:", error);
  }
  // console.log("[AddFormHelper] No stored chain found or error occurred, returning empty array.");
  return [];
}

async function saveChainToStorage(chain: PromptChunk[]): Promise<void> {
  // console.log(`[AddFormHelper] Saving ${chain.length} chunks to storage...`);
  try {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(chain));
  } catch (error) {
    console.error("[AddFormHelper] Failed to save prompt chain:", error);
    await showToast(Toast.Style.Failure, "Failed to Save Chain", "Could not update storage.");
    throw error;
  }
}

/**
 * Represents a header file with its path details.
 */
interface HeaderFileInfo {
  relativePath: string; // e.g., "templates/headers/context_error.txt"
  folder: string; // e.g., "headers"
  name: string; // e.g., "context_error"
  displayName: string; // e.g., "Context Error"
}

/**
 * Structure to hold header file info grouped by folder.
 */
interface GroupedHeaderFiles {
  [folderDisplayName: string]: HeaderFileInfo[];
}

/**
 * Formats a string by replacing underscores/hyphens with spaces and capitalizing words.
 */
function formatName(name: string): string {
  if (!name) return "";
  return name
    .replace(/[-_]/g, " ") // Replace underscores/hyphens with spaces
    .replace(/\.txt$/i, "") // Remove .txt extension (case-insensitive)
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
}

/**
 * Loads favorite header *filenames* from config.json and groups them by folder.
 * Returns an object where keys are formatted folder names and values are arrays of HeaderFileInfo.
 */
async function loadAndGroupFavoriteHeaders(): Promise<GroupedHeaderFiles> {
  console.log("[AddFormHelper] Loading and grouping favorite headers from config...");
  const configPath = path.join(environment.assetsPath, CONFIG_FILE_NAME);
  const groupedHeaders: GroupedHeaderFiles = {};

  try {
    const configFileContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configFileContent);

    if (config && Array.isArray(config.favorite_headers)) {
      const headerFilenames: string[] = config.favorite_headers;
      console.log(`[AddFormHelper] Found ${headerFilenames.length} header filenames in config.`);

      for (const relativePath of headerFilenames) {
        // Extract folder and filename
        const parts = relativePath.split(/[\\/]/); // Split by slash or backslash
        if (parts.length >= 3) {
          // Expecting "templates/foldername/filename.txt"
          const fileName = parts[parts.length - 1];
          const folderName = parts[parts.length - 2];
          const baseName = path.basename(fileName, ".txt"); // Get name without extension

          const formattedFolderName = formatName(folderName);
          const formattedBaseName = formatName(baseName);

          const fileInfo: HeaderFileInfo = {
            relativePath: relativePath,
            folder: folderName,
            name: baseName,
            displayName: formattedBaseName,
          };

          if (!groupedHeaders[formattedFolderName]) {
            groupedHeaders[formattedFolderName] = [];
          }
          groupedHeaders[formattedFolderName].push(fileInfo);
        } else {
          console.warn(`[AddFormHelper] Skipping invalid path format in config: ${relativePath}`);
        }
      }

      // Sort items within each folder alphabetically by display name
      for (const folder in groupedHeaders) {
        groupedHeaders[folder].sort((a, b) => a.displayName.localeCompare(b.displayName));
      }

      console.log(`[AddFormHelper] Grouped headers into ${Object.keys(groupedHeaders).length} folders.`);
    } else {
      console.log("[AddFormHelper] 'favorite_headers' key not found or not an array in config.json.");
    }
    // eslint-disable-next-line
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.log(
        `[AddFormHelper] ${CONFIG_FILE_NAME} not found in assets path (${configPath}). No favorite headers loaded.`,
      );
    } else {
      console.error(`[AddFormHelper] Failed to load or parse ${CONFIG_FILE_NAME} from assets:`, error);
      showToast(Toast.Style.Warning, "Could not load config", `Check ${CONFIG_FILE_NAME} in assets folder.`);
    }
  }

  // Sort folder sections alphabetically
  const sortedGroupedHeaders: GroupedHeaderFiles = {};
  Object.keys(groupedHeaders)
    .sort()
    .forEach((key) => {
      sortedGroupedHeaders[key] = groupedHeaders[key];
    });

  return sortedGroupedHeaders;
}

/**
 * Reads the content of a specific header file.
 * @param relativePath - The path relative to the assets directory (e.g., "templates/headers/file.txt")
 * @returns The file content (trimmed) or null if reading fails.
 */
async function getHeaderFileContent(relativePath: string): Promise<string | null> {
  if (!relativePath || relativePath === "none") return null;

  const filePath = path.join(environment.assetsPath, relativePath);
  // console.log(`[AddFormHelper] Reading content for: ${relativePath} from ${filePath}`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content.trim();
    // eslint-disable-next-line
  } catch (fileError: any) {
    console.error(`[AddFormHelper] Could not read header file "${relativePath}": ${fileError.message}`);
    showToast(Toast.Style.Failure, "File Read Error", `Could not read ${relativePath}`);
    return null; // Indicate failure
  }
}

// --- Main Form Component ---

export default function AddClipboardToChainForm() {
  const { pop } = useNavigation();
  const [clipboardContent, setClipboardContent] = useState<string>("");
  const [customHeader, setCustomHeader] = useState<string>(""); // For the TextArea
  // Store the grouped header structure
  const [groupedHeaderFiles, setGroupedHeaderFiles] = useState<GroupedHeaderFiles>({});
  // Selected value is still the relative path
  const [selectedHeaderFile, setSelectedHeaderFile] = useState<string>("none");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingHeader, setIsLoadingHeader] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load clipboard and grouped favorite header *info* on mount
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          Clipboard.readText(),
          loadAndGroupFavoriteHeaders(), // <-- Load grouped structure
        ]);

        const clipboardResult = results[0];
        const headersResult = results[1];

        if (clipboardResult.status === "fulfilled") {
          setClipboardContent(clipboardResult.value || "");
          if (!clipboardResult.value) {
            console.warn("Clipboard was empty or unreadable on load.");
          }
        } else {
          console.error("Failed to read clipboard:", clipboardResult.reason);
          setError("Could not read clipboard.");
          showToast(Toast.Style.Failure, "Error Reading Clipboard");
        }

        if (headersResult.status === "fulfilled") {
          setGroupedHeaderFiles(headersResult.value); // <-- Set grouped structure
        } else {
          console.error("Failed to load header filenames:", headersResult.reason);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        showToast(Toast.Style.Failure, "Error", "Could not load initial data.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Handle Dropdown Change - reads file and updates customHeader state
  async function handleFavoriteHeaderChange(selectedRelativePath: string) {
    setSelectedHeaderFile(selectedRelativePath); // Store the selected relative path

    if (selectedRelativePath === "none") {
      setCustomHeader("");
      return;
    }

    setIsLoadingHeader(true);
    const content = await getHeaderFileContent(selectedRelativePath);
    setIsLoadingHeader(false);

    if (content !== null) {
      setCustomHeader(content);
    } else {
      // Optionally clear header or keep previous if read fails
      setCustomHeader("");
    }
  }

  // Handle form submission
  // eslint-disable-next-line
  async function handleSubmit(values: { customHeader: string /* favoriteHeaderFile not needed directly */ }) {
    // The header is now simply the current value of the customHeader state (bound to the TextArea)
    const finalHeader = customHeader.trim();

    const toast = await showToast(Toast.Style.Animated, "Adding Chunk...");
    try {
      if (!clipboardContent) {
        throw new Error("Clipboard content is empty or could not be read initially.");
      }

      const currentChain = await loadChainFromStorage();
      const newChunk: PromptChunk = {
        id: uuidv4(),
        header: finalHeader,
        content: clipboardContent,
        enabled: true,
        createdAt: Date.now(),
      };
      const updatedChain = [...currentChain, newChunk];
      await saveChainToStorage(updatedChain);

      toast.style = Toast.Style.Success;
      toast.title = "Chunk Added";
      toast.message = finalHeader ? `"${finalHeader}"` : `Chunk #${updatedChain.length}`;
      pop(); // Close the form on success
    } catch (err) {
      console.error("Failed to add chunk:", err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Add Chunk";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  // --- Render the form ---
  return (
    <Form
      // Combine loading states
      isLoading={isLoading || isLoadingHeader}
      navigationTitle="Add Clipboard to Prompt Chain"
      actions={
        <ActionPanel>
          {/* Submit uses the current form values (implicitly including customHeader state) */}
          <Action.SubmitForm title="Add Chunk" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      {error ? (
        <Form.Description text={`Error: ${error}`} />
      ) : (
        <>
          {/* Clipboard Preview using Form.TextArea */}
          <Form.TextArea
            id="clipboardContent"
            title="Clipboard Content Preview"
            placeholder={isLoading ? "Loading clipboard..." : "Clipboard is empty or could not be read."}
            value={clipboardContent}
            // Make it non-editable
            onChange={() => {}}
            info={clipboardContent ? `${clipboardContent.length} characters` : ""}
          />
          <Form.Separator />

          {/* --- MODIFIED: Dropdown with Sections --- */}
          <Form.Dropdown
            id="favoriteHeaderFile" // ID remains the same
            title="Select Favorite Header" // Title simplified
            info="Select a file to populate the Header field below" // Updated info
            value={selectedHeaderFile}
            onChange={handleFavoriteHeaderChange} // Use the handler that updates customHeader state
          >
            <Form.Dropdown.Item value="none" title="None / Use Custom Below" />
            {/* Iterate over grouped structure */}
            {Object.entries(groupedHeaderFiles).map(([folderDisplayName, files]) => (
              <Form.Dropdown.Section key={folderDisplayName} title={folderDisplayName}>
                {files.map((fileInfo) => (
                  <Form.Dropdown.Item
                    key={fileInfo.relativePath}
                    value={fileInfo.relativePath} // Value is the path needed for reading
                    title={fileInfo.displayName} // Title is the formatted name
                  />
                ))}
              </Form.Dropdown.Section>
            ))}
          </Form.Dropdown>
          {/* --- End of Dropdown Modification --- */}

          {/* --- MODIFIED: Use Form.TextArea for Header/Description --- */}
          <Form.TextArea
            id="customHeader" // This ID is implicitly used by handleSubmit via form values
            title="Header / Description"
            placeholder="Optional: Describe this chunk... (Markdown supported)" // Updated placeholder
            info="Enter description or modify content from selected file. Markdown rendered in previews." // Updated info
            value={customHeader} // Value controlled by state (updated by dropdown or typing)
            onChange={setCustomHeader} // Typing directly updates state
          />
          {/* --- End of Modification --- */}
        </>
      )}
    </Form>
  );
}
