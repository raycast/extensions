import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
  Icon,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join, dirname, extname, basename } from "path";
import { homedir } from "os";

// Types
interface Command {
  id: string;
  name: string;
  title: string;
  description: string;
  filePath: string;
  fileType: "md" | "yaml" | "yml";
  allowedTools?: string[];
  content?: string;
  metadata: Record<string, unknown>;
}

interface CommandFormData {
  name: string;
  title: string;
  description: string;
  allowedTools: string;
  content: string;
  fileType: "md" | "yaml";
  customParams: string;
}

// Utilities
class CommandScanner {
  private commandsDir: string;

  constructor() {
    this.commandsDir = join(homedir(), ".claude", "commands");
  }

  scanCommands(): Command[] {
    try {
      const commands: Command[] = [];
      this.scanDirectory(this.commandsDir, commands);
      return commands;
    } catch {
      console.error("Error scanning commands");
      return [];
    }
  }

  private scanDirectory(dir: string, commands: Command[], relativePath = ""): void {
    try {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          const newRelativePath = relativePath ? join(relativePath, item) : item;
          this.scanDirectory(fullPath, commands, newRelativePath);
        } else if (this.isCommandFile(item)) {
          const command = this.parseCommandFile(fullPath, relativePath);
          if (command) {
            commands.push(command);
          }
        }
      }
    } catch {
      console.error(`Error scanning directory ${dir}`);
    }
  }

  private isCommandFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return ext === ".md" || ext === ".yaml" || ext === ".yml";
  }

  private parseCommandFile(filePath: string, relativePath: string): Command | null {
    try {
      const content = readFileSync(filePath, "utf8");
      const ext = extname(filePath).toLowerCase();
      const filename = basename(filePath, ext);

      let metadata: Record<string, unknown> = {};
      let bodyContent = "";

      if (ext === ".md") {
        const { metadata: frontmatter, content: body } = this.parseFrontmatter(content);
        metadata = frontmatter;
        bodyContent = body;
      } else if (ext === ".yaml" || ext === ".yml") {
        try {
          metadata = this.parseYAML(content);
        } catch (yamlError) {
          console.error(`Error parsing YAML in ${filePath}:`, yamlError);
          return null;
        }
      }

      const id = relativePath ? `${relativePath}/${filename}` : filename;
      const name = (metadata.name as string) || filename;
      const title = (metadata.title as string) || name;
      const description = (metadata.description as string) || "";

      return {
        id,
        name,
        title,
        description,
        filePath,
        fileType: ext === ".md" ? "md" : ext === ".yaml" ? "yaml" : "yml",
        allowedTools: (metadata["allowed-tools"] as string[]) || (metadata.allowedTools as string[]) || [],
        content: bodyContent,
        metadata,
      };
    } catch (error) {
      console.error(`Error parsing command file ${filePath}:`, error);
      return null;
    }
  }

  private parseFrontmatter(content: string): { metadata: Record<string, unknown>; content: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { metadata: {}, content };
    }

    const yamlContent = match[1];
    const bodyContent = match[2];

    try {
      const metadata = this.parseYAML(yamlContent);
      return { metadata, content: bodyContent };
    } catch (error) {
      console.error("Error parsing frontmatter YAML:", error);
      return { metadata: {}, content };
    }
  }

  private parseYAML(yamlContent: string): Record<string, unknown> {
    // Simple YAML parser for basic key-value pairs and arrays
    const lines = yamlContent.split("\n").filter((line) => line.trim() && !line.trim().startsWith("#"));
    const result: Record<string, unknown> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (value.startsWith("[") && value.endsWith("]")) {
        // Parse array
        const arrayContent = value.slice(1, -1);
        result[key] = arrayContent.split(",").map((item) => item.trim().replace(/"/g, ""));
      } else {
        // Parse string value
        result[key] = value.replace(/"/g, "");
      }
    }

    return result;
  }

  saveCommand(command: Command): void {
    try {
      // Ensure directory exists
      const dir = dirname(command.filePath);
      mkdirSync(dir, { recursive: true });

      if (command.fileType === "md") {
        this.saveMarkdownCommand(command);
      } else {
        this.saveYAMLCommand(command);
      }
    } catch (error) {
      console.error("Error saving command:", error);
      throw error;
    }
  }

  private saveMarkdownCommand(command: Command): void {
    let content = "---\n";

    // Write metadata as YAML frontmatter
    for (const [key, value] of Object.entries(command.metadata)) {
      if (Array.isArray(value)) {
        content += `${key}: [${value.map((v) => `"${v}"`).join(", ")}]\n`;
      } else {
        content += `${key}: "${value}"\n`;
      }
    }

    content += "---\n\n";
    content += command.content || "";

    writeFileSync(command.filePath, content, "utf8");
  }

  private saveYAMLCommand(command: Command): void {
    let content = "";

    for (const [key, value] of Object.entries(command.metadata)) {
      if (Array.isArray(value)) {
        content += `${key}: [${value.map((v) => `"${v}"`).join(", ")}]\n`;
      } else {
        content += `${key}: "${value}"\n`;
      }
    }

    writeFileSync(command.filePath, content, "utf8");
  }

  deleteCommand(filePath: string): void {
    try {
      unlinkSync(filePath);
    } catch (error) {
      console.error("Error deleting command:", error);
      throw error;
    }
  }

  renameCommand(oldFilePath: string, newFilePath: string): void {
    try {
      // Read the old file content
      const content = readFileSync(oldFilePath, "utf8");

      // Write to new location
      const dir = dirname(newFilePath);
      mkdirSync(dir, { recursive: true });
      writeFileSync(newFilePath, content, "utf8");

      // Delete old file
      unlinkSync(oldFilePath);
    } catch (error) {
      console.error("Error renaming command:", error);
      throw error;
    }
  }

  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }
}

// Main Component
export default function UserCommandManager() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const scanner = useMemo(() => new CommandScanner(), []);

  useEffect(() => {
    loadCommands();
  }, []);

  const loadCommands = async () => {
    setIsLoading(true);
    try {
      const scannedCommands = scanner.scanCommands();
      setCommands(scannedCommands);
    } catch {
      showFailureToast(new Error("Failed to load commands"), { title: "Failed to load commands" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCommands = commands.filter(
    (command) =>
      command.name.toLowerCase().includes(searchText.toLowerCase()) ||
      command.title.toLowerCase().includes(searchText.toLowerCase()) ||
      command.description.toLowerCase().includes(searchText.toLowerCase()),
  );

  const handleDeleteCommand = async (command: Command) => {
    const confirmed = await confirmAlert({
      title: "Delete Command",
      message: `Are you sure you want to delete "${command.title}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        scanner.deleteCommand(command.filePath);
        await loadCommands();
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: `Deleted command "${command.title}"`,
        });
      } catch {
        showFailureToast(new Error("Failed to delete command"), { title: "Failed to delete command" });
      }
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search commands..."
      navigationTitle="Manage Commands"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Create Command"
              target={<CommandForm scanner={scanner} onSave={loadCommands} />}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Item
        title="Create New Command"
        subtitle="Add a new custom command"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Command"
              target={<CommandForm scanner={scanner} onSave={loadCommands} />}
              icon={Icon.Plus}
            />
          </ActionPanel>
        }
      />

      {filteredCommands.map((command) => (
        <CommandListItem
          key={command.id}
          command={command}
          onDelete={() => handleDeleteCommand(command)}
          onEdit={() => loadCommands()}
          scanner={scanner}
        />
      ))}
    </List>
  );
}

// Command List Item Component
function CommandListItem({
  command,
  onDelete,
  onEdit,
  scanner,
}: {
  command: Command;
  onDelete: () => void;
  onEdit: () => void;
  scanner: CommandScanner;
}) {
  return (
    <List.Item
      title={command.title}
      subtitle={command.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Command"
              target={<CommandForm command={command} scanner={scanner} onSave={onEdit} />}
              icon={Icon.Pencil}
            />
            <Action
              title="Delete Command"
              onAction={onDelete}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy File Path"
              content={command.filePath}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.OpenWith path={command.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Command Form Component
function CommandForm({ command, scanner, onSave }: { command?: Command; scanner: CommandScanner; onSave: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();

  const isEditing = !!command;

  const handleSubmit = async (values: CommandFormData) => {
    // Reset errors
    setNameError(undefined);
    setTitleError(undefined);

    // Validation
    if (!values.name.trim()) {
      setNameError("Command name is required");
      return;
    }

    if (!values.title.trim()) {
      setTitleError("Command title is required");
      return;
    }

    try {
      const commandsDir = join(homedir(), ".claude", "commands");
      const fileType = isEditing ? command?.fileType || "md" : values.fileType || "md";

      // Determine the final file path
      let finalFilePath: string;
      let needsRename = false;

      if (isEditing && command) {
        // For editing, check if name changed
        const newFileName = `${values.name}.${fileType}`;
        const newFilePath = join(commandsDir, newFileName);
        const originalName = basename(command.filePath, `.${command.fileType}`);

        if (values.name !== originalName) {
          // Name changed, check for collisions
          if (scanner.fileExists(newFilePath)) {
            const confirmed = await confirmAlert({
              title: "File Already Exists",
              message: `A command named "${values.name}" already exists. This will overwrite the existing file.`,
              primaryAction: {
                title: "Overwrite",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (!confirmed) {
              return;
            }
          }

          finalFilePath = newFilePath;
          needsRename = true;
        } else {
          // Name didn't change, keep original path
          finalFilePath = command.filePath;
        }
      } else {
        // For new commands, create the path and check for collisions
        const fileName = `${values.name}.${fileType}`;
        finalFilePath = join(commandsDir, fileName);

        if (scanner.fileExists(finalFilePath)) {
          const confirmed = await confirmAlert({
            title: "File Already Exists",
            message: `A command named "${values.name}" already exists. This will overwrite the existing file.`,
            primaryAction: {
              title: "Overwrite",
              style: Alert.ActionStyle.Destructive,
            },
          });

          if (!confirmed) {
            return;
          }
        }
      }

      // Parse custom parameters
      const customParams: Record<string, unknown> = {};
      if (values.customParams.trim()) {
        try {
          const params = values.customParams.split("\n").filter((line) => line.trim());
          for (const param of params) {
            const [key, value] = param.split(":").map((s) => s.trim());
            if (key && value) {
              if (value.startsWith("[") && value.endsWith("]")) {
                customParams[key] = value
                  .slice(1, -1)
                  .split(",")
                  .map((s) => s.trim().replace(/"/g, ""));
              } else {
                customParams[key] = value.replace(/"/g, "");
              }
            }
          }
        } catch {
          showFailureToast(new Error("Invalid custom parameters format"), {
            title: "Invalid custom parameters format",
          });
          return;
        }
      }

      const newCommand: Command = {
        id: values.name,
        name: values.name,
        title: values.title,
        description: values.description,
        filePath: finalFilePath,
        fileType,
        allowedTools: values.allowedTools ? values.allowedTools.split(",").map((s) => s.trim()) : [],
        content: values.content,
        metadata: {
          name: values.name,
          title: values.title,
          description: values.description,
          "allowed-tools": values.allowedTools ? values.allowedTools.split(",").map((s) => s.trim()) : [],
          ...customParams,
        },
      };

      // Handle file operations
      if (isEditing && command && needsRename) {
        // Rename the file (this will also save the new content)
        scanner.renameCommand(command.filePath, finalFilePath);
        // Now update the content with the new values
        scanner.saveCommand(newCommand);
      } else {
        // Normal save operation
        scanner.saveCommand(newCommand);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `${isEditing ? "Updated" : "Created"} command "${values.title}"`,
      });

      onSave();
      pop();
    } catch {
      showFailureToast(new Error(`Failed to ${isEditing ? "update" : "create"} command`), {
        title: `Failed to ${isEditing ? "update" : "create"} command`,
      });
    }
  };

  return (
    <Form
      navigationTitle={isEditing ? "Edit Command" : "Create Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={isEditing ? "Update Command" : "Create Command"} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Command Name"
        placeholder="e.g., analyze"
        defaultValue={command?.name || ""}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />

      <Form.TextField
        id="title"
        title="Command Title"
        placeholder="e.g., Code Analysis"
        defaultValue={command?.title || ""}
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Brief description of what this command does"
        defaultValue={command?.description || ""}
      />

      {!isEditing && (
        <Form.Dropdown id="fileType" title="File Type" defaultValue="md">
          <Form.Dropdown.Item value="md" title="Markdown (.md)" />
          <Form.Dropdown.Item value="yaml" title="YAML (.yaml)" />
        </Form.Dropdown>
      )}

      <Form.TextField
        id="allowedTools"
        title="Allowed Tools"
        placeholder="Read, Grep, Glob, Bash, TodoWrite (comma-separated)"
        defaultValue={command?.allowedTools?.join(", ") || ""}
      />

      <Form.TextArea
        id="customParams"
        title="Custom Parameters"
        placeholder="key: value&#10;array-param: [item1, item2]"
        defaultValue={
          command
            ? Object.entries(command.metadata)
                .filter(([key]) => !["name", "title", "description", "allowed-tools"].includes(key))
                .map(([key, value]) => (Array.isArray(value) ? `${key}: [${value.join(", ")}]` : `${key}: ${value}`))
                .join("\n")
            : ""
        }
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Command documentation and instructions..."
        defaultValue={command?.content || ""}
      />
    </Form>
  );
}
