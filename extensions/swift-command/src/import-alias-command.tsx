import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { readFileSync, existsSync } from "fs";
import { createDataSource, DataSource, Arg } from "./datasource";
import { getDatasourcePath } from "./preference";

interface Preferences {
  aliasFilePath: string;
}

interface Alias {
  name: string;
  command: string;
  description?: string;
}

const ignoreCommandKey = "hideraycast";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const preferenceAliasFilePath = preferences.aliasFilePath || "";

  // Define candidate paths in priority order
  const aliasFilePathCandidates = [
    preferenceAliasFilePath,
    "~/.zshrc",
    "~/.bashrc",
    "~/.config/fish/config.fish",
  ].filter(Boolean); // Remove empty paths

  const [aliasFilePath, setAliasFilePath] = useState<string>("");
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [selectedAliases, setSelectedAliases] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [importStatus, setImportStatus] = useState("");

  // Get the datasource
  useEffect(() => {
    try {
      const filePath = getDatasourcePath();
      const dataSource = createDataSource(filePath);
      setDataSource(dataSource);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data source",
        message: error as string,
      });
    }
  }, []);

  // Find first existing alias file and load aliases from it
  useEffect(() => {
    try {
      // Find the first existing alias file
      let foundValidFile = false;
      let resolvedPath = "";
      let foundPath = "";

      for (const candidatePath of aliasFilePathCandidates) {
        resolvedPath = candidatePath.replace(/^~\//, `${homedir()}/`);
        if (existsSync(resolvedPath)) {
          foundValidFile = true;
          foundPath = candidatePath;
          setAliasFilePath(candidatePath);
          break;
        }
      }

      if (!foundValidFile) {
        showToast({
          style: Toast.Style.Failure,
          title: "No alias file found",
          message: `Could not find any of the candidate alias files. Please specify a valid path in preferences. Checked paths: ${aliasFilePathCandidates.join(", ")}`,
        });
        setIsLoading(false);
        return;
      }

      const content = readFileSync(resolvedPath, "utf-8");

      // Parse aliases from config file
      const lines = content.split("\n");
      const parsedAliases = lines
        .map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("alias")) return null;

          // Check if alias should be hidden
          const prevLine = index > 0 ? lines[index - 1].trim() : "";
          if (prevLine.includes(ignoreCommandKey) || trimmed.includes(ignoreCommandKey)) return null;

          // Extract alias name and command
          const match = trimmed.match(/alias\s+([^=]+)=(?:["'](.+?)["']|([^;"\s]+))(?:;|\s|$)/);
          if (!match) return null;

          // Get description from current or previous line
          const currentLineMatch = trimmed.match(/#\s*man:\s*([^#]+)(?:#|$)/);
          const prevLineMatch = index > 0 ? lines[index - 1].match(/#\s*man:\s*([^#]+)(?:#|$)/) : null;
          const description = (currentLineMatch?.[1] || prevLineMatch?.[1] || "").trim();

          return {
            name: match[1].trim(),
            command: (match[2] || match[3] || "").trim(),
            description,
          };
        })
        .filter(Boolean) as Alias[];

      // Check aliases duplicates
      const uniqueAliases = Array.from(new Map(parsedAliases.map((alias) => [alias.name, alias])).values());

      setAliases(uniqueAliases);

      // Show which file we're loading from
      setImportStatus(`Loading aliases from ${foundPath}`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load aliases",
        message: error as string,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to handle toggling the selection state of an alias
  const toggleAlias = (aliasName: string) => {
    const newSelectedAliases = new Set(selectedAliases);
    if (newSelectedAliases.has(aliasName)) {
      newSelectedAliases.delete(aliasName);
    } else {
      newSelectedAliases.add(aliasName);
    }
    setSelectedAliases(newSelectedAliases);
  };

  // Function to select all aliases
  const selectAll = () => {
    const allAliasNames = aliases.map((alias) => alias.name);
    setSelectedAliases(new Set(allAliasNames));
  };

  // Function to deselect all aliases
  const deselectAll = () => {
    setSelectedAliases(new Set());
  };

  // Import the selected aliases
  const importSelectedAliases = async () => {
    if (!dataSource) {
      showToast({
        style: Toast.Style.Failure,
        title: "Data source not available",
      });
      return;
    }

    if (selectedAliases.size === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No aliases selected",
        message: "Please select at least one alias to import.",
      });
      return;
    }

    setImportStatus("Checking for duplicates...");

    // Check for duplicates
    const existingCommands = dataSource.getAll();
    const duplicates = aliases
      .filter((alias) => selectedAliases.has(alias.name))
      .filter((alias) => existingCommands.some((cmd) => cmd.data === alias.command));

    // If there are duplicates, ask for confirmation
    if (duplicates.length > 0) {
      const shouldOverwrite = await confirmAlert({
        title: "Duplicate Commands Found",
        message: `${duplicates.length} command(s) already exist. Do you want to overwrite them?\n\nDuplicates:\n${duplicates.map((d) => `• ${d.command}`).join("\n")}`,
        primaryAction: {
          title: "Overwrite",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!shouldOverwrite) {
        setImportStatus("Import cancelled - duplicates found");
        return;
      }
    }

    setImportStatus("Importing...");
    let importCount = 0;

    try {
      aliases.forEach((alias) => {
        if (selectedAliases.has(alias.name)) {
          // Parse the command for any arguments with {{arg}} format
          const argRegex = /{{([^}]+)}}/g;
          const args: Arg[] = [];
          let match;

          while ((match = argRegex.exec(alias.command)) !== null) {
            args.push({
              name: match[1],
              value: "",
            });
          }

          // If it's a duplicate, find and update the existing command
          const existingCommand = existingCommands.find((cmd) => cmd.data === alias.command);
          if (existingCommand) {
            // Use alias name if description is missing
            dataSource.update(existingCommand.id, alias.command, alias.description || alias.name || "", args);
          } else {
            // Add as new command
            dataSource.add(alias.command, alias.description || alias.name || "", args);
          }
          importCount++;
        }
      });

      setImportStatus(`Imported ${importCount} alias(es) successfully!`);
      showToast({
        style: Toast.Style.Success,
        title: "Import successful",
        message: `Imported ${importCount} alias(es)`,
      });

      // Clear selections after import
      setSelectedAliases(new Set());
    } catch (error) {
      setImportStatus("Import failed.");
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to import aliases",
        message: error as string,
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search aliases to import..."
      filtering={true}
      isShowingDetail
      navigationTitle="Import Alias Commands"
      actions={
        <ActionPanel>
          <Action
            title="Import Selected Aliases"
            icon={Icon.Download}
            onAction={importSelectedAliases}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            title="Select All"
            icon={Icon.Checkmark}
            onAction={selectAll}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
          <Action
            title="Deselect All"
            icon={Icon.Xmark}
            onAction={deselectAll}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      {importStatus && <List.Section title={importStatus} />}
      <List.Section title={`Found ${aliases.length} Aliases in ${aliasFilePath}`}>
        {aliases.map((alias) => (
          <List.Item
            key={alias.name}
            icon={selectedAliases.has(alias.name) ? Icon.CheckCircle : Icon.Circle}
            title={alias.name}
            subtitle={alias.description || ""}
            detail={
              <List.Item.Detail
                markdown={`## ${alias.name}\n\n${
                  alias.description ? `### Description\n${alias.description}\n\n` : ""
                }### Command\n\`\`\`bash\n${alias.command}\n\`\`\`\n\n`}
              />
            }
            accessories={[
              {
                text: alias.command,
                icon: Icon.Code,
                tooltip: `Command: ${alias.command}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={selectedAliases.has(alias.name) ? "Deselect" : "Select for Import"}
                  icon={selectedAliases.has(alias.name) ? Icon.Xmark : Icon.Checkmark}
                  onAction={() => toggleAlias(alias.name)}
                />
                <Action
                  title="Import Selected Aliases"
                  icon={Icon.Download}
                  onAction={importSelectedAliases}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action
                  title="Select All"
                  icon={Icon.Checkmark}
                  onAction={selectAll}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                />
                <Action
                  title="Deselect All"
                  icon={Icon.Xmark}
                  onAction={deselectAll}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
