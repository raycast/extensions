import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
  Color,
  AI,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { GitUtils } from "./git-utils";
import { StorageManager } from "./storage";
import { Repository, ICONS } from "./types";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// ==================== Types ====================

type ItemStatus = "New" | "Existing" | "Error";
type FilterType = "all" | "new" | "existing" | "with-changes" | "pinned";

interface RepositoryItem extends Repository {
  status: ItemStatus;
  errorMessage?: string;
  isSelected?: boolean;
}

interface ScanOptions {
  maxDepth: number;
  autoGenerateContext: boolean;
}

// ==================== Quick Scan Presets ====================

const QUICK_SCAN_PRESETS = [
  { name: "Projects Folder", path: `${process.env.HOME}/Projects` },
  { name: "Code Folder", path: `${process.env.HOME}/Code` },
  { name: "Work Folder", path: `${process.env.HOME}/Work` },
  { name: "Desktop", path: `${process.env.HOME}/Desktop` },
  { name: "Documents", path: `${process.env.HOME}/Documents` },
];

// ==================== Helper Functions ====================

async function detectProjectType(repoPath: string): Promise<string> {
  try {
    const fs = await import("fs").then((m) => m.promises);
    const files = await fs.readdir(repoPath);

    if (files.includes("package.json")) return "Node.js/JavaScript";
    if (files.includes("Cargo.toml")) return "Rust";
    if (files.includes("go.mod")) return "Go";
    if (files.includes("pom.xml")) return "Java/Maven";
    if (files.includes("build.gradle")) return "Java/Gradle";
    if (files.includes("requirements.txt") || files.includes("setup.py")) return "Python";
    if (files.includes("Gemfile")) return "Ruby";
    if (files.includes("composer.json")) return "PHP";
    if (files.some((f) => f.endsWith(".csproj"))) return ".NET/C#";
    if (files.some((f) => f.endsWith(".swift"))) return "Swift/iOS";

    return "Unknown";
  } catch {
    return "Unknown";
  }
}

async function generateContextForRepo(repoPath: string): Promise<string> {
  try {
    const repoInfo = await GitUtils.getRepositoryInfo(repoPath);
    const recentCommits = await GitUtils.getRecentCommits(repoPath, 5);
    const projectType = await detectProjectType(repoPath);

    const prompt = `Analyze this Git repository and generate a comprehensive context description:

📁 Repository Path: ${repoPath}
🌿 Current Branch: ${repoInfo.branch}
📊 Project Type: ${projectType}

📋 Recent Commit History:
${recentCommits.map((c, i) => `${i + 1}. ${c.message} (${c.author}, ${new Date(c.date).toLocaleDateString()})`).join("\n")}

🔍 Analysis Requirements:
Based on the repository path, branch name, project type, and commit patterns, provide a detailed context that includes:

1. **Project Domain & Purpose**: What is the main goal of this project?
2. **Technology Stack**: What programming languages, frameworks, and tools are being used?
3. **Target Audience**: Who are the primary users of this project?
4. **Development Context**: What type of changes are typically made?

**Output Format**: Write 2-3 concise sentences that capture the essence of this repository. Be specific and actionable.`;

    const aiContext = await AI.ask(prompt);
    return aiContext;
  } catch (error) {
    throw new Error(`Failed to generate context: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// ==================== Edit Repository Form ====================

interface EditRepositoryFormProps {
  item: RepositoryItem;
  onSave: (updates: Partial<RepositoryItem>) => void;
}

function EditRepositoryForm({ item, onSave }: EditRepositoryFormProps) {
  const [displayName, setDisplayName] = useState(item.displayName || item.name);
  const [context, setContext] = useState(item.context || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit() {
    onSave({ displayName: displayName || undefined, context: context || undefined });
    await showToast({ style: Toast.Style.Success, title: "Saved" });
    pop();
  }

  async function handleGenerateContext() {
    setIsGenerating(true);
    try {
      const generated = await generateContextForRepo(item.path);
      setContext(generated);
      await showToast({ style: Toast.Style.Success, title: "Context generated" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate context",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Form
      navigationTitle={`Edit ${item.name}`}
      isLoading={isGenerating}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} icon={Icon.Checkmark} />
          <Action
            title="Generate Context with AI"
            icon={Icon.Wand}
            onAction={handleGenerateContext}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="displayName"
        title="Display Name"
        placeholder={item.name}
        value={displayName}
        onChange={setDisplayName}
      />
      <Form.TextArea
        id="context"
        title="Repository Context"
        placeholder="Describe this repository to help AI generate better commit messages"
        value={context}
        onChange={setContext}
        info="💡 Tip: Use AI to automatically generate context based on repository structure"
      />
    </Form>
  );
}

// ==================== Scan Options Form ====================

interface ScanFormProps {
  onScan: (folders: string[], options: ScanOptions) => Promise<void>;
  onCancel: () => void;
}

function ScanForm({ onScan, onCancel }: ScanFormProps) {
  const [folders, setFolders] = useState<string[]>([]);
  const [maxDepth, setMaxDepth] = useState<string>("5");
  const [autoGenerateContext, setAutoGenerateContext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleScan() {
    if (folders.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select at least one folder" });
      return;
    }

    setIsLoading(true);
    try {
      await onScan(folders, {
        maxDepth: parseInt(maxDepth),
        autoGenerateContext,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQuickScan(presetPath: string) {
    setIsLoading(true);
    try {
      await onScan([presetPath], { maxDepth: parseInt(maxDepth), autoGenerateContext });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Start Scan"
              icon={Icon.MagnifyingGlass}
              onAction={handleScan}
              shortcut={{ modifiers: [], key: "return" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Quick Scan">
            <Action
              title={QUICK_SCAN_PRESETS[0].name}
              icon={Icon.Folder}
              onAction={() => handleQuickScan(QUICK_SCAN_PRESETS[0].path)}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
            <Action
              title={QUICK_SCAN_PRESETS[1].name}
              icon={Icon.Folder}
              onAction={() => handleQuickScan(QUICK_SCAN_PRESETS[1].path)}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action
              title={QUICK_SCAN_PRESETS[2].name}
              icon={Icon.Folder}
              onAction={() => handleQuickScan(QUICK_SCAN_PRESETS[2].path)}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
            <Action
              title={QUICK_SCAN_PRESETS[3].name}
              icon={Icon.Folder}
              onAction={() => handleQuickScan(QUICK_SCAN_PRESETS[3].path)}
              shortcut={{ modifiers: ["cmd"], key: "4" }}
            />
            <Action
              title={QUICK_SCAN_PRESETS[4].name}
              icon={Icon.Folder}
              onAction={() => handleQuickScan(QUICK_SCAN_PRESETS[4].path)}
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Cancel" icon={Icon.Xmark} onAction={onCancel} shortcut={{ modifiers: ["cmd"], key: "." }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Scan folders to discover Git repositories" />
      <Form.FilePicker
        id="folders"
        title="Folders to Scan"
        value={folders}
        onChange={setFolders}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
      />
      <Form.Separator />
      <Form.Dropdown id="maxDepth" title="Scan Depth" value={maxDepth} onChange={setMaxDepth}>
        <Form.Dropdown.Item value="3" title="3 levels (Fast)" />
        <Form.Dropdown.Item value="5" title="5 levels (Default)" />
        <Form.Dropdown.Item value="10" title="10 levels (Deep)" />
        <Form.Dropdown.Item value="999" title="Unlimited (Very Slow)" />
      </Form.Dropdown>
      <Form.Checkbox
        id="autoGenerateContext"
        label="Auto-generate context with AI after scan"
        value={autoGenerateContext}
        onChange={setAutoGenerateContext}
      />
    </Form>
  );
}

// ==================== Main Component ====================

export default function ManageRepositories() {
  const [items, setItems] = useState<RepositoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showScanForm, setShowScanForm] = useState(false);

  // Load existing repositories on mount
  useEffect(() => {
    loadRepositories();
  }, []);

  async function loadRepositories() {
    try {
      setIsLoading(true);
      const repos = await StorageManager.getRepositories();
      const repoItems: RepositoryItem[] = repos.map((repo) => ({
        ...repo,
        status: "Existing" as ItemStatus,
      }));
      setItems(repoItems);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load repositories",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleScan(folders: string[], options: ScanOptions) {
    try {
      setIsLoading(true);
      await showToast({ style: Toast.Style.Animated, title: "Scanning..." });

      const pathsSet = new Set<string>();
      for (const folder of folders) {
        const found = await GitUtils.scanForRepositories(folder, options.maxDepth);
        for (const p of found) pathsSet.add(p);
      }

      const paths = Array.from(pathsSet);
      const existingPaths = new Set(items.filter((i) => i.status === "Existing").map((i) => i.path));
      const scannedItems: RepositoryItem[] = [];

      for (const repoPath of paths) {
        try {
          const info = await GitUtils.getRepositoryInfo(repoPath);
          const existingItem = items.find((i) => i.path === repoPath);

          scannedItems.push({
            id: existingItem?.id || uuidv4(),
            path: repoPath,
            name: path.basename(repoPath),
            displayName: existingItem?.displayName || path.basename(repoPath),
            branch: info.branch || "unknown",
            lastUsed: existingItem?.lastUsed || Date.now(),
            useCount: existingItem?.useCount || 0,
            isPinned: existingItem?.isPinned || false,
            hasChanges: info.hasChanges || false,
            changedFilesCount: info.changedFilesCount || 0,
            lastCommit: info.lastCommit,
            context: existingItem?.context,
            gitStatus: info.gitStatus,
            status: existingPaths.has(repoPath) ? "Existing" : "New",
          });
        } catch (e) {
          scannedItems.push({
            id: uuidv4(),
            path: repoPath,
            name: path.basename(repoPath),
            displayName: path.basename(repoPath),
            branch: "unknown",
            lastUsed: Date.now(),
            useCount: 0,
            isPinned: false,
            hasChanges: false,
            changedFilesCount: 0,
            status: "Error",
            errorMessage: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }

      // Merge with existing items
      const mergedItems = [...scannedItems, ...items.filter((i) => !pathsSet.has(i.path))];
      setItems(mergedItems);
      setShowScanForm(false);

      const newCount = scannedItems.filter((i) => i.status === "New").length;
      await showToast({
        style: Toast.Style.Success,
        title: "Scan complete",
        message: `Found ${newCount} new repositories`,
      });

      // Auto-generate context if enabled
      if (options.autoGenerateContext && newCount > 0) {
        await batchGenerateContext(scannedItems.filter((i) => i.status === "New" && !i.context).map((i) => i.id));
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ==================== Batch Operations ====================

  async function batchGenerateContext(ids?: string[]) {
    const targetIds = ids || Array.from(selectedIds);
    if (targetIds.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select at least one repository" });
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < targetIds.length; i++) {
        const item = items.find((it) => it.id === targetIds[i]);
        if (!item) continue;

        await showToast({
          style: Toast.Style.Animated,
          title: `Generating context... (${i + 1}/${targetIds.length})`,
          message: item.displayName || item.name,
        });

        try {
          const context = await generateContextForRepo(item.path);
          setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, context } : it)));
          successCount++;
        } catch {
          failCount++;
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Context generation complete",
        message: `✅ ${successCount} succeeded, ❌ ${failCount} failed`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function batchDelete() {
    if (selectedIds.size === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select at least one repository" });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Repositories",
      message: `Are you sure you want to delete ${selectedIds.size} ${selectedIds.size === 1 ? "repository" : "repositories"}?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      for (const id of selectedIds) {
        await StorageManager.removeRepository(id);
      }
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      await showToast({ style: Toast.Style.Success, title: `Deleted ${selectedIds.size} repositories` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete repositories",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function batchTogglePin() {
    if (selectedIds.size === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select at least one repository" });
      return;
    }

    try {
      setIsLoading(true);
      for (const id of selectedIds) {
        await StorageManager.togglePinRepository(id);
      }
      await loadRepositories();
      await showToast({ style: Toast.Style.Success, title: "Updated pin status" });
    } finally {
      setIsLoading(false);
    }
  }

  async function batchRefresh() {
    if (selectedIds.size === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select at least one repository" });
      return;
    }

    try {
      setIsLoading(true);
      for (const id of selectedIds) {
        const item = items.find((i) => i.id === id);
        if (!item) continue;

        const info = await GitUtils.getRepositoryInfo(item.path);
        await StorageManager.updateRepository(id, {
          branch: info.branch,
          hasChanges: info.hasChanges,
          changedFilesCount: info.changedFilesCount,
          lastCommit: info.lastCommit,
          gitStatus: info.gitStatus,
        });
      }
      await loadRepositories();
      await showToast({ style: Toast.Style.Success, title: "Refreshed repositories" });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveNewRepositories() {
    const newItems = items.filter((i) => i.status === "New");
    if (newItems.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No new repositories to save" });
      return;
    }

    try {
      setIsLoading(true);
      for (const item of newItems) {
        await StorageManager.addRepository(item);
      }
      await showToast({ style: Toast.Style.Success, title: `Added ${newItems.length} repositories` });
      await loadRepositories();
    } finally {
      setIsLoading(false);
    }
  }

  // ==================== Selection Helpers ====================

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  // ==================== Filtering & Grouping ====================

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply search
    if (searchText) {
      filtered = filtered.filter(
        (i) =>
          (i.displayName || i.name).toLowerCase().includes(searchText.toLowerCase()) ||
          i.path.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Apply filter
    switch (filter) {
      case "new":
        filtered = filtered.filter((i) => i.status === "New");
        break;
      case "existing":
        filtered = filtered.filter((i) => i.status === "Existing");
        break;
      case "with-changes":
        filtered = filtered.filter((i) => i.hasChanges);
        break;
      case "pinned":
        filtered = filtered.filter((i) => i.isPinned);
        break;
    }

    return filtered;
  }, [items, searchText, filter]);

  const groupedItems = useMemo(() => {
    const newItems = filteredItems.filter((i) => i.status === "New");
    const existingItems = filteredItems.filter((i) => i.status === "Existing");
    const errorItems = filteredItems.filter((i) => i.status === "Error");

    return { newItems, existingItems, errorItems };
  }, [filteredItems]);

  // ==================== UI Components ====================

  function getItemIcon(item: RepositoryItem) {
    if (item.status === "Error") return Icon.Xmark;
    if (item.isPinned) return ICONS.PINNED;
    if (item.hasChanges) return ICONS.CODE;
    return ICONS.SUCCESS;
  }

  function getItemIconColor(item: RepositoryItem) {
    if (item.status === "Error") return Color.Red;
    if (item.hasChanges) return Color.Orange;
    return Color.Green;
  }

  function getItemMetadata(item: RepositoryItem) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Repository Name" text={item.displayName || item.name} />
        <List.Item.Detail.Metadata.Label title="Status" text={item.status} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Path" text={item.path} />
        <List.Item.Detail.Metadata.Label title="Branch" text={item.branch} />
        {item.hasChanges && (
          <List.Item.Detail.Metadata.Label
            title="Changes"
            text={`${item.changedFilesCount} file${item.changedFilesCount === 1 ? "" : "s"}`}
            icon={{ source: Icon.Circle, tintColor: Color.Orange }}
          />
        )}
        {item.lastCommit && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Last Commit" text={item.lastCommit.message} />
            <List.Item.Detail.Metadata.Label title="Author" text={item.lastCommit.author} />
            <List.Item.Detail.Metadata.Label title="Date" text={new Date(item.lastCommit.date).toLocaleString()} />
          </>
        )}
        {item.context && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Context" text={item.context} />
          </>
        )}
        {item.errorMessage && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Error"
              text={item.errorMessage}
              icon={{ source: Icon.Xmark, tintColor: Color.Red }}
            />
          </>
        )}
      </List.Item.Detail.Metadata>
    );
  }

  function updateItem(id: string, updates: Partial<RepositoryItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }

  // Show scan form if requested
  if (showScanForm) {
    return (
      <ScanForm
        onScan={handleScan}
        onCancel={() => {
          setShowScanForm(false);
        }}
      />
    );
  }

  // Main List View
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search repositories..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(value) => setFilter(value as FilterType)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="New" value="new" />
          <List.Dropdown.Item title="Existing" value="existing" />
          <List.Dropdown.Item title="With Changes" value="with-changes" />
          <List.Dropdown.Item title="Pinned" value="pinned" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Scan Folders"
              icon={Icon.MagnifyingGlass}
              onAction={() => setShowScanForm(true)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Selection">
            <Action
              title="Select All"
              icon={Icon.CheckCircle}
              onAction={selectAll}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
            <Action
              title="Deselect All"
              icon={Icon.Circle}
              onAction={deselectAll}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Batch Operations">
            <Action
              title="Generate Context (AI)"
              icon={Icon.Wand}
              onAction={() => batchGenerateContext()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            />
            <Action
              title="Delete Selected"
              icon={Icon.Trash}
              onAction={batchDelete}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              style={Action.Style.Destructive}
            />
            <Action
              title="Pin/Unpin Selected"
              icon={Icon.Pin}
              onAction={batchTogglePin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action
              title="Refresh Selected"
              icon={Icon.ArrowClockwise}
              onAction={batchRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
          {groupedItems.newItems.length > 0 && (
            <ActionPanel.Section>
              <Action
                title="Save New Repositories"
                icon={Icon.Plus}
                onAction={saveNewRepositories}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      {groupedItems.newItems.length > 0 && (
        <List.Section
          title="New Repositories"
          subtitle={`${groupedItems.newItems.length} ${groupedItems.newItems.length === 1 ? "repository" : "repositories"}`}
        >
          {groupedItems.newItems.map((item) => (
            <List.Item
              key={item.id}
              title={item.displayName || item.name}
              icon={{ source: getItemIcon(item), tintColor: getItemIconColor(item) }}
              accessories={[
                {
                  icon: selectedIds.has(item.id) ? Icon.CheckCircle : Icon.Circle,
                  tooltip: "Click to select",
                },
              ]}
              detail={<List.Item.Detail metadata={getItemMetadata(item)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={selectedIds.has(item.id) ? "Deselect" : "Select"}
                      icon={selectedIds.has(item.id) ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggleSelection(item.id)}
                    />
                    <Action.Push
                      title="Edit"
                      icon={Icon.Pencil}
                      target={<EditRepositoryForm item={item} onSave={(updates) => updateItem(item.id, updates)} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Scan Folders"
                      icon={Icon.MagnifyingGlass}
                      onAction={() => setShowScanForm(true)}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Batch Operations">
                    <Action
                      title="Generate Context (AI)"
                      icon={Icon.Wand}
                      onAction={() => batchGenerateContext()}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                    />
                    <Action
                      title="Delete Selected"
                      icon={Icon.Trash}
                      onAction={batchDelete}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Save New Repositories"
                      icon={Icon.Plus}
                      onAction={saveNewRepositories}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {groupedItems.existingItems.length > 0 && (
        <List.Section
          title="Existing Repositories"
          subtitle={`${groupedItems.existingItems.length} ${groupedItems.existingItems.length === 1 ? "repository" : "repositories"}`}
        >
          {groupedItems.existingItems.map((item) => (
            <List.Item
              key={item.id}
              title={item.displayName || item.name}
              icon={{ source: getItemIcon(item), tintColor: getItemIconColor(item) }}
              accessories={[
                {
                  icon: selectedIds.has(item.id) ? Icon.CheckCircle : Icon.Circle,
                  tooltip: "Click to select",
                },
              ]}
              detail={<List.Item.Detail metadata={getItemMetadata(item)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={selectedIds.has(item.id) ? "Deselect" : "Select"}
                      icon={selectedIds.has(item.id) ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggleSelection(item.id)}
                    />
                    <Action.Push
                      title="Edit"
                      icon={Icon.Pencil}
                      target={<EditRepositoryForm item={item} onSave={(updates) => updateItem(item.id, updates)} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Scan Folders"
                      icon={Icon.MagnifyingGlass}
                      onAction={() => setShowScanForm(true)}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Batch Operations">
                    <Action
                      title="Generate Context (AI)"
                      icon={Icon.Wand}
                      onAction={() => batchGenerateContext()}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                    />
                    <Action
                      title="Delete Selected"
                      icon={Icon.Trash}
                      onAction={batchDelete}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      style={Action.Style.Destructive}
                    />
                    <Action
                      title="Pin/Unpin Selected"
                      icon={Icon.Pin}
                      onAction={batchTogglePin}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                    <Action
                      title="Refresh Selected"
                      icon={Icon.ArrowClockwise}
                      onAction={batchRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {groupedItems.errorItems.length > 0 && (
        <List.Section title="Errors" subtitle={`${groupedItems.errorItems.length} errors`}>
          {groupedItems.errorItems.map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              icon={{ source: Icon.Xmark, tintColor: Color.Red }}
              accessories={[{ text: "Error" }]}
              detail={<List.Item.Detail metadata={getItemMetadata(item)} />}
            />
          ))}
        </List.Section>
      )}

      {filteredItems.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No repositories found"
          description="Scan folders to discover Git repositories"
          actions={
            <ActionPanel>
              <Action
                title="Scan Folders"
                icon={Icon.MagnifyingGlass}
                onAction={() => setShowScanForm(true)}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
