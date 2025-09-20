import {
  Action,
  ActionPanel,
  List,
  Toast,
  showToast,
  Icon,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Alert,
  useNavigation,
  Keyboard,
  open,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  getPrompts,
  Prompt,
  deletePrompt,
  initializeDefaults,
} from "./lib/storage";
import PromptForm from "./components/PromptForm";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import os from "os";
import path from "path";

export default function AmpCommand() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    initializeDefaults().then(() => loadPrompts());
  }, []);

  async function loadPrompts() {
    setIsLoading(true);
    try {
      const stored = await getPrompts();
      setPrompts(
        stored.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      );
    } catch (error) {
      showFailureToast(error, { title: "Failed to load prompts" });
    } finally {
      setIsLoading(false);
    }
  }

  async function pasteAmpCommand(prompt: Prompt) {
    try {
      const command = `amp -x "${prompt.prompt}"`;
      await Clipboard.paste(command);
      await closeMainWindow();
      showToast(Toast.Style.Success, "Command pasted!");
    } catch (error) {
      showFailureToast(error, { title: "Failed to paste command" });
    }
  }

  async function copyAmpCommand(prompt: Prompt) {
    try {
      const command = `amp -x "${prompt.prompt}"`;
      await Clipboard.copy(command);
      showToast(Toast.Style.Success, "Command copied to clipboard!");
    } catch (error) {
      showFailureToast(error, { title: "Failed to copy command" });
    }
  }

  async function downloadAsMarkdown(prompt: Prompt) {
    try {
      const filename = prompt.title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const markdownContent = `# ${prompt.title}

**Category:** ${prompt.category || "Uncategorized"}
${prompt.description ? `\n**Description:** ${prompt.description}\n` : ""}
**Prompt:**
\`\`\`
${prompt.prompt}
\`\`\`

**Command:**
\`\`\`bash
amp -x "${prompt.prompt}"
\`\`\`
`;

      const downloadsPath = path.join(os.homedir(), "Downloads");
      const filePath = path.join(downloadsPath, `${filename}.md`);

      fs.writeFileSync(filePath, markdownContent);

      await open(filePath);
      showToast(Toast.Style.Success, "Markdown file downloaded!");
    } catch (error) {
      showFailureToast(error, { title: "Failed to download markdown" });
    }
  }

  function addNewPrompt() {
    push(<PromptForm onSave={loadPrompts} />);
  }

  function editPrompt(prompt: Prompt) {
    push(<PromptForm prompt={prompt} onSave={loadPrompts} />);
  }

  async function confirmDeletePrompt(prompt: Prompt) {
    const confirmed = await confirmAlert({
      title: "Delete Prompt",
      message: `Are you sure you want to delete "${prompt.title}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deletePrompt(prompt.id);
        await loadPrompts();
        showToast(Toast.Style.Success, "Prompt deleted successfully");
      } catch (error) {
        showFailureToast(error, { title: "Failed to delete prompt" });
      }
    }
  }

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.title.toLowerCase().includes(searchText.toLowerCase()) ||
      prompt.category.toLowerCase().includes(searchText.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const groupedPrompts = filteredPrompts.reduce(
    (groups, prompt) => {
      const category = prompt.category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(prompt);
      return groups;
    },
    {} as Record<string, Prompt[]>,
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts..."
    >
      {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
        <List.Section key={category} title={category}>
          {categoryPrompts.map((prompt) => {
            return (
              <List.Item
                key={prompt.id}
                title={prompt.title}
                {...(prompt.description
                  ? { subtitle: prompt.description }
                  : {})}
                accessories={[
                  {
                    date: prompt.updatedAt,
                    tooltip: `Last updated: ${prompt.updatedAt.toLocaleString()}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Paste Command"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      icon={Icon.Clipboard}
                      onAction={() => pasteAmpCommand(prompt)}
                    />

                    <Action
                      title="Copy Command"
                      icon={Icon.CopyClipboard}
                      onAction={() => copyAmpCommand(prompt)}
                    />

                    <Action
                      title="Download as Markdown"
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      icon={Icon.Download}
                      onAction={() => downloadAsMarkdown(prompt)}
                    />

                    <ActionPanel.Section title="Manage">
                      <Action
                        title="Add New Prompt"
                        shortcut={Keyboard.Shortcut.Common.New}
                        icon={Icon.Plus}
                        onAction={addNewPrompt}
                      />

                      <Action
                        title="Edit Prompt"
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        icon={Icon.Pencil}
                        onAction={() => editPrompt(prompt)}
                      />

                      <Action
                        title="Delete Prompt"
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => confirmDeletePrompt(prompt)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {filteredPrompts.length === 0 && !isLoading && (
        <List.EmptyView
          title="No prompts found"
          description="Add a new prompt or adjust your search"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title="Add New Prompt"
                shortcut={Keyboard.Shortcut.Common.New}
                icon={Icon.Plus}
                onAction={addNewPrompt}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
