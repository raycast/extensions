import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  useNavigation,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import { CustomCommand } from "./types";

const SYSTEM_COMMANDS: CustomCommand[] = [
  { name: "connect", description: "Add a provider to OpenCode", template: "", isSystem: true, isInteractive: true },
  { name: "compact", description: "Compact the current session", template: "", isSystem: true, isInteractive: false },
  { name: "details", description: "Toggle tool execution details", template: "", isSystem: true, isInteractive: false },
  {
    name: "editor",
    description: "Open external editor for composing messages",
    template: "",
    isSystem: true,
    isInteractive: true,
  },
  { name: "exit", description: "Exit OpenCode", template: "", isSystem: true, isInteractive: false },
  {
    name: "export",
    description: "Export current conversation to Markdown",
    template: "",
    isSystem: true,
    isInteractive: false,
  },
  { name: "help", description: "Show the help dialog", template: "", isSystem: true, isInteractive: true },
  { name: "init", description: "Create or update AGENTS.md file", template: "", isSystem: true, isInteractive: true },
  { name: "models", description: "List available models", template: "", isSystem: true, isInteractive: false },
  { name: "new", description: "Start a new session", template: "", isSystem: true, isInteractive: false },
  { name: "redo", description: "Redo a previously undone message", template: "", isSystem: true, isInteractive: false },
  {
    name: "sessions",
    description: "List and switch between sessions",
    template: "",
    isSystem: true,
    isInteractive: true,
  },
  { name: "share", description: "Share current session", template: "", isSystem: true, isInteractive: false },
  { name: "themes", description: "List available themes", template: "", isSystem: true, isInteractive: true },
  {
    name: "thinking",
    description: "Toggle visibility of thinking/reasoning blocks",
    template: "",
    isSystem: true,
    isInteractive: false,
  },
  {
    name: "undo",
    description: "Undo last message in the conversation",
    template: "",
    isSystem: true,
    isInteractive: false,
  },
  { name: "unshare", description: "Unshare current session", template: "", isSystem: true, isInteractive: false },
];

export default function Command() {
  const [filter, setFilter] = useState<string>("all");
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCustomCommands = async () => {
    setIsLoading(true);
    try {
      const configPath = path.join(os.homedir(), ".config", "opencode", "commands");
      if (fs.existsSync(configPath)) {
        const files = fs.readdirSync(configPath).filter((f) => f.endsWith(".md"));
        const commands: CustomCommand[] = files.map((file) => {
          const content = fs.readFileSync(path.join(configPath, file), "utf-8");
          const name = file.replace(".md", "");

          // Basic frontmatter parsing
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          let description = "";
          let agent = "";
          let model = "";
          let template = content;

          if (frontmatterMatch) {
            const lines = frontmatterMatch[1].split("\n");
            lines.forEach((line) => {
              const [key, ...value] = line.split(":");
              const val = value.join(":").trim();
              if (key.trim() === "description") description = val;
              if (key.trim() === "agent") agent = val;
              if (key.trim() === "model") model = val;
            });
            template = content.replace(frontmatterMatch[0], "").trim();
          }

          return { name, description, agent, model, template, isSystem: false, isInteractive: false };
        });
        setCustomCommands(commands);
      }
    } catch (e) {
      console.error("Failed to load custom commands:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomCommands();
  }, []);

  const allCommands = [...SYSTEM_COMMANDS, ...customCommands];
  const filteredCommands = allCommands.filter((cmd) => {
    if (filter === "system") return cmd.isSystem;
    if (filter === "custom") return !cmd.isSystem;
    return true;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search commands..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Commands" storeValue={true} onChange={setFilter}>
          <List.Dropdown.Item title="All Commands" value="all" />
          <List.Dropdown.Item title="System Commands" value="system" />
          <List.Dropdown.Item title="Custom Commands" value="custom" />
        </List.Dropdown>
      }
    >
      <List.Section
        title={filter === "all" ? "All Commands" : filter === "system" ? "System Commands" : "Custom Commands"}
      >
        {filteredCommands.map((cmd) => (
          <List.Item
            key={cmd.name}
            title={`/${cmd.name}`}
            subtitle={cmd.description}
            accessories={[
              {
                tag: {
                  value: cmd.isInteractive ? "Interactive" : "Non-interactive",
                  color: cmd.isInteractive ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Command" content={`/${cmd.name}`} />
                  <Action.Paste
                    title="Paste in Active App"
                    content={`/${cmd.name}`}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create New Command"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<CreateCommandForm onCreated={loadCustomCommands} />}
                    icon={Icon.Plus}
                  />
                  {!cmd.isSystem && <Action title="Reload" onAction={loadCustomCommands} icon={Icon.ArrowClockwise} />}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CreateCommandForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: {
    name: string;
    description: string;
    agent: string;
    model: string;
    template: string;
  }) => {
    if (!values.name || !values.template) {
      await showToast({ style: Toast.Style.Failure, title: "Name and Template are required" });
      return;
    }

    try {
      const configPath = path.join(os.homedir(), ".config", "opencode", "commands");
      if (!fs.existsSync(configPath)) {
        fs.mkdirSync(configPath, { recursive: true });
      }

      const filePath = path.join(configPath, `${values.name}.md`);
      const content = `---
description: ${values.description}
agent: ${values.agent}
model: ${values.model}
---
${values.template}`;

      fs.writeFileSync(filePath, content, "utf-8");
      await showToast({ style: Toast.Style.Success, title: "Command created", message: `/${values.name} is ready` });
      onCreated();
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to create command", message: String(e) });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Command" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Command Name" placeholder="e.g. test" />
      <Form.TextField id="description" title="Description" placeholder="What does this command do?" />
      <Form.TextField id="agent" title="Agent" placeholder="e.g. build, plan (optional)" />
      <Form.TextField id="model" title="Model" placeholder="e.g. anthropic/claude-3-5-sonnet (optional)" />
      <Form.TextArea
        id="template"
        title="Prompt Template"
        placeholder="The prompt to send to the LLM. Supports $ARGUMENTS, $1, !`command`, @file"
      />
    </Form>
  );
}
