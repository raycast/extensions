import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  environment,
  // Remove popToRoot, closeMainWindow imports for now
} from "@raycast/api";
import { useChainState } from "./hooks/useChainState"; // Correct path assumed
import fs from "fs/promises"; // Use async fs operations
import path from "path";
import { useEffect, useState, useCallback } from "react";

/**
 * Represents a single template file.
 */
interface TemplateFile {
  name: string; // Cleaned file name (e.g., "Python Class")
  fileName: string; // Original file name (e.g., "python_class.txt")
  fullPath: string; // Absolute path to the file
  folder: string; // Name of the parent folder (e.g., "code_structures")
}

/**
 * Structure to hold templates grouped by folder.
 */
interface TemplateGroups {
  [folder: string]: TemplateFile[];
}

/**
 * Formats a string by replacing underscores/hyphens with spaces and capitalizing words.
 */
function formatName(name: string): string {
  return name
    .replace(/[-_]/g, " ") // Replace underscores/hyphens with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
}

export default function AddTemplateToChainCommand() {
  // Import addChunk, potentially addMultipleChunks if implementing explicit multi-add later
  const { addChunk } = useChainState();
  const [templateGroups, setTemplateGroups] = useState<TemplateGroups>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reads the template directory, groups files by folder.
   */
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const groups: TemplateGroups = {};
    try {
      // Resolve the path relative to the extension's assets
      const templatesDir = path.join(environment.assetsPath, "templates");

      const folderEntries = await fs.readdir(templatesDir, { withFileTypes: true });

      for (const folderEntry of folderEntries) {
        if (folderEntry.isDirectory()) {
          const folderName = folderEntry.name;
          const folderPath = path.join(templatesDir, folderName);
          const files: TemplateFile[] = [];

          try {
            const fileEntries = await fs.readdir(folderPath, { withFileTypes: true });
            for (const fileEntry of fileEntries) {
              // Assuming templates are text files, adjust if needed
              if (fileEntry.isFile() && fileEntry.name.endsWith(".txt")) {
                const fileName = fileEntry.name;
                const fullPath = path.join(folderPath, fileName);
                files.push({
                  name: formatName(path.basename(fileName, ".txt")), // Cleaned name
                  fileName: fileName,
                  fullPath: fullPath,
                  folder: formatName(folderName), // Cleaned folder name
                });
              }
            }
            if (files.length > 0) {
              // Sort files alphabetically within the folder
              files.sort((a, b) => a.name.localeCompare(b.name));
              groups[formatName(folderName)] = files; // Use formatted folder name as key
            }
          } catch (innerError) {
            console.error(`Error reading folder ${folderName}:`, innerError);
            // Optionally skip this folder or report specific error
          }
        }
      }

      // Sort folders alphabetically
      const sortedGroupKeys = Object.keys(groups).sort();
      const sortedGroups: TemplateGroups = {};
      for (const key of sortedGroupKeys) {
        sortedGroups[key] = groups[key];
      }

      setTemplateGroups(sortedGroups);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setError("Could not load templates from assets directory.");
      await showToast(Toast.Style.Failure, "Error Loading Templates", "Check console for details.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  /**
   * Action handler to add the selected template content as a chunk.
   * This might be called multiple times by Raycast if multiple items are selected.
   * The window will NOT close automatically.
   */
  const handleAddTemplate = useCallback(
    async (template: TemplateFile) => {
      // Show minimal toast, as this might fire multiple times
      const toast = await showToast(Toast.Style.Animated, "Adding", template.name);
      try {
        const content = await fs.readFile(template.fullPath, "utf-8");
        // Use folder and cleaned name as the header
        const header = `${template.folder}: ${template.name}`;
        // Use addChunk for simplicity, assuming Raycast iterates the action
        await addChunk(header, content);

        // Update toast on success for this item
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        toast.message = header;

        // --- REMOVED ---
        // await closeMainWindow(); // Don't close automatically
        // await popToRoot({ clearSearchBar: true }); // Don't pop automatically
        // --- END REMOVED ---
      } catch (err) {
        console.error(`Failed to add template chunk [${template.name}]:`, err);
        // Update toast on failure for this item
        toast.style = Toast.Style.Failure;
        toast.title = "Error Adding";
        toast.message = `Could not read/add ${template.name}`;
      }
    },
    [addChunk], // Dependency on addChunk
  );

  // Display error message if loading failed
  if (error && !isLoading) {
    return (
      <List>
        <List.EmptyView title="Error Loading Templates" description={error} icon={{ source: "⚠️" }} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search templates..."
      // Potentially add isShowingDetail if you want to show previews
    >
      {Object.entries(templateGroups).map(([folder, templates]) => (
        <List.Section key={folder} title={folder}>
          {templates.map((template) => (
            <List.Item
              key={template.fullPath}
              title={template.name}
              keywords={[folder, ...template.name.split(" ")]}
              // Optional: Add accessory title or detail view later
              actions={
                <ActionPanel>
                  <Action
                    title="Add Template(s) to Chain" // Title hints at multi-select possibility
                    onAction={() => handleAddTemplate(template)}
                  />
                  <Action
                    title="Reload Templates"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadTemplates}
                    icon={{ source: "🔁" }}
                  />
                  {/* Consider adding an Action.OpenInEditor later */}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {/* Handle case where no templates are found after loading */}
      {!isLoading && Object.keys(templateGroups).length === 0 && !error && (
        <List.EmptyView title="No Templates Found" description="Check the 'assets/templates' directory." icon="🧐" />
      )}
    </List>
  );
}
