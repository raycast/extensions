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
import { useState, useEffect } from "react";
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join, dirname, extname, basename } from "path";
import { homedir } from "os";

// Types
interface Agent {
  id: string;
  name: string;
  description: string;
  tools?: string[];
  color?: string;
  filePath: string;
  fileType: "md" | "yaml" | "yml";
  content?: string;
  metadata: Record<string, unknown>;
}

interface AgentFormData {
  name: string;
  description: string;
  tools: string;
  color: string;
  content: string;
  fileType: "md" | "yaml";
  customParams: string;
}

// Available colors for agents
const AGENT_COLORS = [
  { value: "red", name: "Red" },
  { value: "orange", name: "Orange" },
  { value: "yellow", name: "Yellow" },
  { value: "green", name: "Green" },
  { value: "blue", name: "Blue" },
  { value: "purple", name: "Purple" },
  { value: "magenta", name: "Magenta" },
  { value: "cyan", name: "Cyan" },
];

// Utilities
class AgentScanner {
  private agentsDir: string;

  constructor() {
    this.agentsDir = join(homedir(), ".claude", "agents");
  }

  scanAgents(): Agent[] {
    try {
      const agents: Agent[] = [];
      if (!this.directoryExists(this.agentsDir)) {
        mkdirSync(this.agentsDir, { recursive: true });
        return agents;
      }
      this.scanDirectory(this.agentsDir, agents);
      return agents;
    } catch {
      console.error("Error scanning agents");
      return [];
    }
  }

  private directoryExists(dir: string): boolean {
    try {
      const stat = statSync(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private scanDirectory(dir: string, agents: Agent[], relativePath = ""): void {
    try {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          const newRelativePath = relativePath ? join(relativePath, item) : item;
          this.scanDirectory(fullPath, agents, newRelativePath);
        } else if (this.isAgentFile(item)) {
          const agent = this.parseAgentFile(fullPath, relativePath);
          if (agent) {
            agents.push(agent);
          }
        }
      }
    } catch {
      console.error(`Error scanning directory ${dir}`);
    }
  }

  private isAgentFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return ext === ".md" || ext === ".yaml" || ext === ".yml";
  }

  private parseAgentFile(filePath: string, relativePath: string): Agent | null {
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
      const description = (metadata.description as string) || "";
      const tools = metadata.tools || [];
      const color = (metadata.color as string) || "blue";

      return {
        id,
        name,
        description,
        tools: Array.isArray(tools) ? tools : typeof tools === "string" ? tools.split(",").map((t) => t.trim()) : [],
        color,
        filePath,
        fileType: ext === ".md" ? "md" : ext === ".yaml" ? "yaml" : "yml",
        content: bodyContent,
        metadata,
      };
    } catch (error) {
      console.error(`Error parsing agent file ${filePath}:`, error);
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
      let value = line.substring(colonIndex + 1).trim();

      // Handle quoted strings
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (value.startsWith("[") && value.endsWith("]")) {
        // Parse array
        const arrayContent = value.slice(1, -1);
        result[key] = arrayContent.split(",").map((item) => item.trim().replace(/["']/g, ""));
      } else {
        // Parse string value
        result[key] = value;
      }
    }

    return result;
  }

  saveAgent(agent: Agent): void {
    try {
      // Ensure directory exists
      const dir = dirname(agent.filePath);
      mkdirSync(dir, { recursive: true });

      if (agent.fileType === "md") {
        this.saveMarkdownAgent(agent);
      } else {
        this.saveYAMLAgent(agent);
      }
    } catch (error) {
      console.error("Error saving agent:", error);
      throw error;
    }
  }

  private saveMarkdownAgent(agent: Agent): void {
    let content = "---\n";

    // Write metadata as YAML frontmatter
    for (const [key, value] of Object.entries(agent.metadata)) {
      if (Array.isArray(value)) {
        content += `${key}: ${value.join(", ")}\n`;
      } else if (typeof value === "string" && value.includes(" ")) {
        content += `${key}: "${value}"\n`;
      } else {
        content += `${key}: ${value}\n`;
      }
    }

    content += "---\n\n";
    content += agent.content || "";

    writeFileSync(agent.filePath, content, "utf8");
  }

  private saveYAMLAgent(agent: Agent): void {
    let content = "";

    for (const [key, value] of Object.entries(agent.metadata)) {
      if (Array.isArray(value)) {
        content += `${key}: ${value.join(", ")}\n`;
      } else if (typeof value === "string" && value.includes(" ")) {
        content += `${key}: "${value}"\n`;
      } else {
        content += `${key}: ${value}\n`;
      }
    }

    writeFileSync(agent.filePath, content, "utf8");
  }

  deleteAgent(filePath: string): void {
    try {
      unlinkSync(filePath);
    } catch (error) {
      console.error("Error deleting agent:", error);
      throw error;
    }
  }

  renameAgent(oldFilePath: string, newFilePath: string): void {
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
      console.error("Error renaming agent:", error);
      throw error;
    }
  }

  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }
}

// Main Component
export default function UserAgentsManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const scanner = new AgentScanner();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const scannedAgents = scanner.scanAgents();
      setAgents(scannedAgents);
    } catch {
      showFailureToast(new Error("Failed to load agents"), { title: "Failed to load agents" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchText.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchText.toLowerCase()) ||
      agent.tools?.some((tool) => tool.toLowerCase().includes(searchText.toLowerCase())),
  );

  const handleDeleteAgent = async (agent: Agent) => {
    const confirmed = await confirmAlert({
      title: "Delete Agent",
      message: `Are you sure you want to delete "${agent.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        scanner.deleteAgent(agent.filePath);
        await loadAgents();
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: `Deleted agent "${agent.name}"`,
        });
      } catch {
        showFailureToast(new Error("Failed to delete agent"), { title: "Failed to delete agent" });
      }
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search agents..."
      navigationTitle="Manage Subagents"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Create Agent"
              target={<AgentForm scanner={scanner} onSave={loadAgents} />}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Item
        title="Create New Agent"
        subtitle="Add a new subagent"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Agent"
              target={<AgentForm scanner={scanner} onSave={loadAgents} />}
              icon={Icon.Plus}
            />
          </ActionPanel>
        }
      />

      {filteredAgents.map((agent) => (
        <AgentListItem
          key={agent.id}
          agent={agent}
          onDelete={() => handleDeleteAgent(agent)}
          onEdit={() => loadAgents()}
          scanner={scanner}
        />
      ))}
    </List>
  );
}

// Agent List Item Component
function AgentListItem({
  agent,
  onDelete,
  onEdit,
  scanner,
}: {
  agent: Agent;
  onDelete: () => void;
  onEdit: () => void;
  scanner: AgentScanner;
}) {
  return (
    <List.Item
      title={agent.name}
      subtitle={agent.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Agent"
              target={<AgentForm agent={agent} scanner={scanner} onSave={onEdit} />}
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title="Delete Agent"
              onAction={onDelete}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy File Path"
              content={agent.filePath}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.OpenWith path={agent.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Agent Form Component
function AgentForm({ agent, scanner, onSave }: { agent?: Agent; scanner: AgentScanner; onSave: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();

  const isEditing = !!agent;

  const handleSubmit = async (values: AgentFormData) => {
    // Reset errors
    setNameError(undefined);
    setDescriptionError(undefined);

    // Validation
    if (!values.name.trim()) {
      setNameError("Agent name is required");
      return;
    }

    if (!values.description.trim()) {
      setDescriptionError("Agent description is required");
      return;
    }

    try {
      const agentsDir = join(homedir(), ".claude", "agents");
      const fileType = isEditing ? agent?.fileType || "md" : values.fileType || "md";

      // Determine the final file path
      let finalFilePath: string;
      let needsRename = false;

      if (isEditing && agent) {
        // For editing, check if name changed
        const newFileName = `${values.name}.${fileType}`;
        const newFilePath = join(agentsDir, newFileName);
        const originalName = basename(agent.filePath, `.${agent.fileType}`);

        if (values.name !== originalName) {
          // Name changed, check for collisions
          if (scanner.fileExists(newFilePath)) {
            const confirmed = await confirmAlert({
              title: "File Already Exists",
              message: `An agent named "${values.name}" already exists. This will overwrite the existing file.`,
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
          finalFilePath = agent.filePath;
        }
      } else {
        // For new agents, create the path and check for collisions
        const fileName = `${values.name}.${fileType}`;
        finalFilePath = join(agentsDir, fileName);

        if (scanner.fileExists(finalFilePath)) {
          const confirmed = await confirmAlert({
            title: "File Already Exists",
            message: `An agent named "${values.name}" already exists. This will overwrite the existing file.`,
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

      const newAgent: Agent = {
        id: values.name,
        name: values.name,
        description: values.description,
        tools: values.tools
          ? values.tools
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        color: values.color || "blue",
        filePath: finalFilePath,
        fileType,
        content: values.content,
        metadata: {
          name: values.name,
          description: values.description,
          tools: values.tools
            ? values.tools
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          color: values.color || "blue",
          ...customParams,
        },
      };

      // Handle file operations
      if (isEditing && agent && needsRename) {
        // Rename the file (this will also save the new content)
        scanner.renameAgent(agent.filePath, finalFilePath);
        // Now update the content with the new values
        scanner.saveAgent(newAgent);
      } else {
        // Normal save operation
        scanner.saveAgent(newAgent);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `${isEditing ? "Updated" : "Created"} agent "${values.name}"`,
      });

      onSave();
      pop();
    } catch {
      showFailureToast(new Error(`Failed to ${isEditing ? "update" : "create"} agent`), {
        title: `Failed to ${isEditing ? "update" : "create"} agent`,
      });
    }
  };

  return (
    <Form
      navigationTitle={isEditing ? "Edit Agent" : "Create Agent"}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={isEditing ? "Update Agent" : "Create Agent"} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Agent Name"
        placeholder="e.g., code-refactorer"
        defaultValue={agent?.name || ""}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Brief description of what this agent does"
        defaultValue={agent?.description || ""}
        error={descriptionError}
        onChange={() => setDescriptionError(undefined)}
      />

      <Form.Dropdown id="color" title="Color" defaultValue={agent?.color || "blue"}>
        {AGENT_COLORS.map((color) => (
          <Form.Dropdown.Item key={color.value} value={color.value} title={color.name} />
        ))}
      </Form.Dropdown>

      {!isEditing && (
        <Form.Dropdown id="fileType" title="File Type" defaultValue="md">
          <Form.Dropdown.Item value="md" title="Markdown (.md)" />
          <Form.Dropdown.Item value="yaml" title="YAML (.yaml)" />
        </Form.Dropdown>
      )}

      <Form.TextField
        id="tools"
        title="Tools"
        placeholder="Read, Grep, Glob, Bash (comma-separated)"
        defaultValue={agent?.tools?.join(", ") || ""}
        info="Available tools: Read, Write, Edit, MultiEdit, Grep, Glob, LS, Bash, TodoWrite, NotebookRead, NotebookEdit, WebFetch, Task"
      />

      <Form.TextArea
        id="customParams"
        title="Custom Parameters"
        placeholder="key: value&#10;array-param: [item1, item2]"
        defaultValue={
          agent
            ? Object.entries(agent.metadata)
                .filter(([key]) => !["name", "description", "tools", "color"].includes(key))
                .map(([key, value]) => (Array.isArray(value) ? `${key}: [${value.join(", ")}]` : `${key}: ${value}`))
                .join("\n")
            : ""
        }
      />

      <Form.TextArea
        id="content"
        title="System Prompt"
        placeholder="Detailed instructions for the agent..."
        defaultValue={agent?.content || ""}
      />
    </Form>
  );
}
