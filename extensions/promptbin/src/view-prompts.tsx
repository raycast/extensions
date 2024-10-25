import { List, ActionPanel, Action, showToast, Toast, Clipboard, closeMainWindow, popToRoot, Form, Alert, confirmAlert, environment, open, useNavigation, Navigation, LocalStorage } from "@raycast/api";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import React, { useState, useEffect } from "react";
import { Prompt } from "./types";
import { PromptStore } from "./store";
import { readdir } from 'fs/promises';
import BackupList from "./backup-list";

export default function ViewPrompts(): React.ReactElement {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const navigation = useNavigation();

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      const loadedPrompts = await PromptStore.getPrompts();
      setPrompts(loadedPrompts);
      if (loadedPrompts.length > 0) {
        setSelectedPrompt(loadedPrompts[0]);
      }
    } catch (error) {
      console.error("Failed to load prompts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(content: string, title: string) {
    try {
      await Clipboard.copy(content);
      await showToast({
        style: Toast.Style.Success,
        title: "Prompt Copied",
        message: `"${title}" ready to paste`
      });
      await popToRoot();
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy",
        message: "Please try again"
      });
    }
  }

  async function handlePaste(content: string) {
    try {
      await Clipboard.paste(content);
      await showToast({
        style: Toast.Style.Success,
        title: "Pasted in active app",
      });
      await popToRoot();
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to paste",
      });
    }
  }

  async function handleEdit(prompt: Prompt, values: Record<string, string>) {
    try {
      const updatedPrompt: Prompt = {
        ...prompt,
        title: values.title,
        content: values.content,
        category: values.category,
        tags: values.tags.split(",").map(tag => tag.trim()),
      };
  
      const currentPrompts = await LocalStorage.getItem<string>("prompts");
      const parsedPrompts: Prompt[] = currentPrompts ? JSON.parse(currentPrompts) : [];
      const updatedPrompts = parsedPrompts.map(p => 
        p.id === prompt.id ? updatedPrompt : p
      );
  
      await LocalStorage.setItem("prompts", JSON.stringify(updatedPrompts));
      await loadPrompts();
      
      await showToast({
        style: Toast.Style.Success,
        title: "Prompt updated successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update prompt",
      });
    }
  }
  
  async function toggleFavorite(prompt: Prompt) {
    try {
      const updatedPrompt = { ...prompt, isFavorite: !prompt.isFavorite };
      const currentPrompts = await LocalStorage.getItem<string>("prompts");
      const parsedPrompts: Prompt[] = currentPrompts ? JSON.parse(currentPrompts) : [];
      const updatedPrompts = parsedPrompts.map(p => 
        p.id === prompt.id ? updatedPrompt : p
      );
  
      await LocalStorage.setItem("prompts", JSON.stringify(updatedPrompts));
      await loadPrompts();
      
      await showToast({
        style: Toast.Style.Success,
        title: updatedPrompt.isFavorite ? "Added to Favorites" : "Removed from Favorites",
        message: prompt.title
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorite status",
        message: "Please try again"
      });
    }
  }

  async function handleDelete(prompt: Prompt) {
    if (await confirmAlert({
      title: "Delete Prompt",
      message: `Are you sure you want to delete "${prompt.title}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    })) {
      try {
        const currentPrompts = await LocalStorage.getItem<string>("prompts");
        const parsedPrompts: Prompt[] = currentPrompts ? JSON.parse(currentPrompts) : [];
        const updatedPrompts = parsedPrompts.filter(p => p.id !== prompt.id);
  
        await LocalStorage.setItem("prompts", JSON.stringify(updatedPrompts));
        await loadPrompts();
        
        await showToast({
          style: Toast.Style.Success,
          title: "Prompt Deleted",
          message: prompt.title
        });
      }catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete",
          message: "Please try again"
    });
    }
  }
}

  async function handleExport() {
  try {
    const currentPrompts = await LocalStorage.getItem<string>("prompts");
    const fileName = `promptbase-backup-${new Date().toISOString().split('T')[0]}.json`;
    const filePath = path.join(environment.supportPath, fileName);
    
    await writeFile(filePath, currentPrompts || '[]', 'utf-8');
    await showToast({
      style: Toast.Style.Success,
      title: "Backup Created",
      message: `Saved to ${filePath}`
    });
    
    await open(environment.supportPath);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Export Failed",
      message: "Could not create backup"
    });
  }
}
  
  async function handleManualBackup() {
    try {
      await PromptStore.createAutoBackup();
      
      await showToast({
        style: Toast.Style.Success,
        title: "Backup Created",
        message: "Saved in extension's backup folder"
      });
  
      // Open the backup folder
      const backupPath = path.join(environment.supportPath, 'backups');
      await open(backupPath);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Backup Failed",
        message: "Could not create backup"
      });
    }
  }

  async function handleImport() {
      const handleBackupNavigation = () => {
      // Using React element directly for navigation
      navigation.push(<BackupList loadPrompts={loadPrompts} />);
    };
  }

  // Get unique categories for the dropdown
  const categories = [...new Set(prompts.map((prompt: Prompt) => prompt.category))];

  // Filter prompts based on category and search
  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = !categoryFilter || prompt.category === categoryFilter;
    const searchLower = searchText.toLowerCase();
    const matchesSearch = !searchText || 
      prompt.title.toLowerCase().includes(searchLower) ||
      prompt.content.toLowerCase().includes(searchLower) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
      prompt.category.toLowerCase().includes(searchLower);

    return matchesCategory && matchesSearch;
  });

  // Group prompts by date
const groupedPrompts = filteredPrompts.reduce((groups: Record<string, Prompt[]>, prompt) => {
  const category = prompt.category || "Uncategorized";
  
  if (!groups[category]) {
    groups[category] = [];
  }
  groups[category].push(prompt);
  return groups;
}, {} as Record<string, Prompt[]>);

if (isEditing && selectedPrompt) {
  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm 
              title="Update Prompt" 
              onSubmit={(values) => handleEdit(selectedPrompt, values)} 
            />
            <Action 
              title="Cancel" 
              onAction={() => setIsEditing(false)} 
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Backup">
            <Action
              title="Create Backup"
              onAction={handleManualBackup}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            />
            <Action
              title="Show Backups"
              onAction={handleImport}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
        <Form.TextField
          id="title"
          title="Title"
          defaultValue={selectedPrompt.title}
        />
        <Form.TextArea
          id="content"
          title="Content"
          defaultValue={selectedPrompt.content}
        />
        <Form.TextField
          id="category"
          title="Category"
          defaultValue={selectedPrompt.category}
        />
        <Form.TextField
          id="tags"
          title="Tags"
          defaultValue={selectedPrompt.tags.join(", ")}
        />
      </Form>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search prompts..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          storeValue={true}
          onChange={setCategoryFilter}
        >
          <List.Dropdown.Item title="All Categories" value="" />
          {categories.map((category: string) => (
            <List.Dropdown.Item
              key={category}
              title={category}
              value={category}
            />
          ))}
        </List.Dropdown>
      }
      isShowingDetail
    >
      {filteredPrompts.some(p => p.isFavorite) && (
        <List.Section title="Favorites">
          {filteredPrompts
            .filter(prompt => prompt.isFavorite)
            .map((prompt: Prompt) => (
              <List.Item
                key={prompt.id}
                title={prompt.title}
                accessories={[{ text: "★" }]}
                detail={
                  <List.Item.Detail
                    markdown={`${prompt.content}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Information" />
                        <List.Item.Detail.Metadata.Label title="Category" text={prompt.category} />
                        <List.Item.Detail.Metadata.Label title="Tags" text={prompt.tags.join(", ")} />
                        <List.Item.Detail.Metadata.Label 
                          title="Created" 
                          text={new Date(prompt.dateCreated).toLocaleDateString()} 
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action 
                        title="Paste in Active App"
                        onAction={() => handlePaste(prompt.content)}
                      />
                      <Action 
                        title="Copy Prompt" 
                        onAction={() => handleCopy(prompt.content, prompt.title)}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action
                        title="Remove from Favorites"
                        onAction={() => toggleFavorite(prompt)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        icon={{ source: "★" }}
                      />
                      <Action
                        title="Edit Prompt"
                        onAction={() => {
                          setSelectedPrompt(prompt);
                          setIsEditing(true);
                        }}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                      <Action
                        title="Delete Prompt"
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(prompt)}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    </ActionPanel.Section>
                    
                    <ActionPanel.Section title="Backup">
                      <Action
                        title="Create Backup"
                        onAction={handleManualBackup}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                      />
                      <Action
                        title="Show Backups"
                        onAction={handleImport}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}

      {Object.entries(groupedPrompts).map(([group, groupPrompts]) => (
        <List.Section key={group} title={group}>
          {groupPrompts
            .filter(prompt => !prompt.isFavorite)
            .map((prompt: Prompt) => (
              <List.Item
                key={prompt.id}
                title={prompt.title}
                detail={
                  <List.Item.Detail
                    markdown={`${prompt.content}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Information" />
                        <List.Item.Detail.Metadata.Label title="Category" text={prompt.category} />
                        <List.Item.Detail.Metadata.Label title="Tags" text={prompt.tags.join(", ")} />
                        <List.Item.Detail.Metadata.Label 
                          title="Created" 
                          text={new Date(prompt.dateCreated).toLocaleDateString()} 
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action 
                        title="Paste in Active App"
                        onAction={() => handlePaste(prompt.content)}
                      />
                      <Action 
                        title="Copy Prompt" 
                        onAction={() => handleCopy(prompt.content, prompt.title)}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action
                        title="Add to Favorites"
                        onAction={() => toggleFavorite(prompt)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        icon={{ source: "★" }}
                      />
                      <Action
                        title="Edit Prompt"
                        onAction={() => {
                          setSelectedPrompt(prompt);
                          setIsEditing(true);
                        }}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                      <Action
                        title="Delete Prompt"
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(prompt)}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Backup">
                      <Action
                        title="Create Backup"
                        onAction={handleManualBackup}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                      />
                      <Action
                        title="Show Backups"
                        onAction={handleImport}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}