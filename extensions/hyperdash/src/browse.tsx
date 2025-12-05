import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  scanVault,
  type Note,
  sortByMtimeDesc,
  updateNoteStatus,
  updateNoteDate,
  updateNoteProject,
  updateNotePriority,
  updateNoteTitle,
  createProjectNote,
  createTodoNote,
} from "./utils";
import { readBaseConfig, evaluateWithView } from "./bases";
import { clearVaultCache } from "./cache";

type Prefs = {
  basesTodoFile: string;
  todoViewName: string;
  basesProjectFile: string;
  projectViewName: string;
  showRecurrence?: boolean;
  showPriority?: boolean;
  showTimeTracking?: boolean;
  maxResults?: string;
};

function formatDate(dateStr: string): string {
  try {
    // Parse as local date to avoid timezone issues
    // Split "2025-10-26" into [2025, 10, 26]
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const monthStr = date.toLocaleDateString("en-US", { month: "short" });
      return `${monthStr} ${day}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function isOverdue(dateStr: string): boolean {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dueDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to midnight for fair comparison
      return dueDate < today;
    }
    return false;
  } catch {
    return false;
  }
}

function isToday(dateStr: string): boolean {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dueDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }
    return false;
  } catch {
    return false;
  }
}

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [loadingRef, setLoadingRef] = useState(false);

  async function load(rebuildCache = false) {
    // Prevent duplicate simultaneous loads (React 18 strict mode calls useEffect twice)
    if (loadingRef) return;
    setLoadingRef(true);

    try {
      setIsLoading(true);

      // Validate required fields
      if (!prefs.basesTodoFile?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Set Todo Base File in Preferences",
        });
        setNotes([]);
        return;
      }

      if (!prefs.basesProjectFile?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Set Project Base File in Preferences",
        });
        setNotes([]);
        return;
      }

      // Read configurations from Base files
      const [todoConfig, projectConfig] = await Promise.all([
        readBaseConfig(prefs.basesTodoFile.trim()),
        readBaseConfig(prefs.basesProjectFile.trim()),
      ]);

      // Validate that Base files were parsed successfully
      if (!todoConfig) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to parse Todo Base file",
          message: "Check that your base file is valid YAML",
        });
        setNotes([]);
        return;
      }

      if (!projectConfig) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to parse Project Base file",
          message: "Check that your base file is valid YAML",
        });
        setNotes([]);
        return;
      }

      // Validate that vault paths were found
      if (!todoConfig.vaultPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not find vault for Todo Base file",
          message:
            "Make sure your .base file is inside an Obsidian vault with .obsidian folder",
        });
        setNotes([]);
        return;
      }

      if (!projectConfig.vaultPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not find vault for Project Base file",
          message:
            "Make sure your .base file is inside an Obsidian vault with .obsidian folder",
        });
        setNotes([]);
        return;
      }

      // Display effective filter info
      const todoTagFilters = todoConfig.filters.filter(
        (f) => f.property === "tags",
      );
      const projectTagFilters = projectConfig.filters.filter(
        (f) => f.property === "tags",
      );

      // Scan the vault with inline filtering
      const todoViewName = prefs.todoViewName.trim();
      const projectViewName = prefs.projectViewName.trim();

      const filterFn = (note: Note) => {
        // Apply filters during scan to avoid loading all files into memory
        const matchesTodo = evaluateWithView(todoConfig, note, todoViewName);
        const matchesProject = evaluateWithView(
          projectConfig,
          note,
          projectViewName,
        );

        // Only keep notes that match either filter
        if (!matchesTodo && !matchesProject) return null;

        return {
          ...note,
          hasTodoTag: matchesTodo,
          hasProjectTag: matchesProject,
        };
      };

      // Clear cache if rebuild requested
      if (rebuildCache) {
        clearVaultCache(todoConfig.vaultPath);
      }

      // Extract tags from base configs for early filtering
      const todoTags = todoTagFilters.flatMap((f) => f.values);
      const projectTags = projectTagFilters.flatMap((f) => f.values);

      // Scan vault with Raycast Cache enabled
      const scanned = await scanVault({
        vaultPath: todoConfig.vaultPath,
        todoTags,
        projectTags,
        useCache: true, // ✅ Enable Raycast Cache API
        filterFn,
        maxAge: 5 * 60 * 1000, // 5 minutes
      });

      // Update UI first (fast!)
      setNotes(scanned);
      setIsLoading(false);
      setLoadingRef(false);

      // Fire-and-forget toast (non-blocking, won't be cancelled)
      const todoCount = scanned.filter((n) => n.hasTodoTag).length;
      const projectCount = scanned.filter((n) => n.hasProjectTag).length;
      void showToast({
        style: Toast.Style.Success,
        title: `✓ Loaded ${scanned.length} notes`,
        message: `${todoCount} todos, ${projectCount} projects`,
      });
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load",
        message: String((e as Error)?.message ?? e),
      });
      setIsLoading(false);
      setLoadingRef(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function handleCreateTodo() {
    if (!searchText.trim()) return;

    try {
      if (!prefs.basesTodoFile?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Todo Base file not set",
        });
        return;
      }

      // Get todo config from base file
      const todoConfig = await readBaseConfig(prefs.basesTodoFile.trim());

      if (!todoConfig || !todoConfig.vaultPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to parse Todo Base file",
          message:
            "Check that your base file is valid and in an Obsidian vault",
        });
        return;
      }

      // Extract all tags from tag filters
      const todoTagFilters = todoConfig.filters.filter(
        (f) => f.property === "tags",
      );
      if (
        todoTagFilters.length === 0 ||
        todoTagFilters[0].values.length === 0
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No tags found in Todo Base file",
          message: "Base file must contain at least one tag filter",
        });
        return;
      }

      const todoTags = todoTagFilters.flatMap((f) => f.values);

      // Create new todo note (pass cached notes for fast folder detection)
      const newNotePath = await createTodoNote(
        todoConfig.vaultPath,
        searchText.trim(),
        todoTags,
        undefined,
        undefined,
        notes,
      );

      // Create a Note object for the new todo to add to state immediately
      const newNote: Note = {
        title: searchText.trim(),
        path: newNotePath,
        relativePath: newNotePath.replace(todoConfig.vaultPath + "/", ""),
        tags: todoTags.map((t) => t.toLowerCase()),
        mtimeMs: Date.now(),
        hasTodoTag: true,
        hasProjectTag: false,
        status: "todo",
        project: undefined,
        dateDue: undefined,
        dateStarted: undefined,
        dateScheduled: undefined,
        recurrence: undefined,
        recurrenceAnchor: undefined,
        priority: undefined,
        timeTracked: 0,
        timeEstimate: 0,
      };

      // Add the new note to the current notes state immediately
      setNotes([...notes, newNote]);

      await showToast({
        style: Toast.Style.Success,
        title: "Todo Created",
        message: searchText.trim(),
      });

      // Clear search
      setSearchText("");

      // Clear cache in background so next reload gets fresh data
      clearVaultCache(todoConfig.vaultPath);
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create todo",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  // Group todos by status
  const todos = useMemo(() => notes.filter((n) => n.hasTodoTag), [notes]);

  // Filter todos by search text with performance limit
  const filteredTodos = useMemo(() => {
    const prefs = getPreferenceValues<Prefs>();
    const maxResults = parseInt(prefs.maxResults || "500", 10);

    let filtered = todos;
    if (searchText.trim()) {
      const searchLower = searchText.trim().toLowerCase();
      filtered = todos.filter((n) =>
        n.title.toLowerCase().includes(searchLower),
      );
    }

    // Sort by priority (alphabetical), then by due date, then by mtime
    filtered = filtered.sort((a, b) => {
      // Priority first (alphabetical sorting as per TaskNotes 4.0.1)
      if (a.priority && b.priority) {
        const priorityCompare = a.priority.localeCompare(b.priority);
        if (priorityCompare !== 0) return priorityCompare;
      } else if (a.priority) return -1;
      else if (b.priority) return 1;

      // Then by due date
      if (a.dateDue && b.dateDue) {
        const dateCompare = a.dateDue.localeCompare(b.dateDue);
        if (dateCompare !== 0) return dateCompare;
      } else if (a.dateDue) return -1;
      else if (b.dateDue) return 1;

      // Finally by modification time
      return b.mtimeMs - a.mtimeMs;
    });

    // Apply performance limit
    return filtered.slice(0, maxResults);
  }, [todos, searchText]);

  const inProgress = useMemo(
    () =>
      filteredTodos
        .filter((n) => n.status === "in-progress")
        .sort(sortByMtimeDesc),
    [filteredTodos],
  );
  const upNext = useMemo(
    () =>
      filteredTodos
        .filter((n) => n.status === "next" || n.status === "up next")
        .sort(sortByMtimeDesc),
    [filteredTodos],
  );
  const todoItems = useMemo(
    () =>
      filteredTodos
        .filter(
          (n) =>
            n.status === "todo" ||
            n.status === "not started" ||
            n.status === "open" ||
            !n.status,
        )
        .sort(sortByMtimeDesc),
    [filteredTodos],
  );
  const holdStuck = useMemo(
    () =>
      filteredTodos
        .filter(
          (n) =>
            n.status === "hold/stuck" ||
            n.status === "stuck" ||
            n.status === "hold",
        )
        .sort(sortByMtimeDesc),
    [filteredTodos],
  );
  const waiting = useMemo(
    () =>
      filteredTodos.filter((n) => n.status === "waiting").sort(sortByMtimeDesc),
    [filteredTodos],
  );
  const someday = useMemo(
    () =>
      filteredTodos.filter((n) => n.status === "someday").sort(sortByMtimeDesc),
    [filteredTodos],
  );

  // Check if search text exactly matches any existing todo
  const showCreateOption = useMemo(() => {
    if (!searchText.trim()) return false;
    const searchLower = searchText.trim().toLowerCase();
    return !todos.some((todo) => todo.title.toLowerCase() === searchLower);
  }, [searchText, todos]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search notes by title…"
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {showCreateOption && (
        <List.Section title="Create New">
          <List.Item
            title={`Create New Todo: "${searchText.trim()}"`}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Create Todo"
                  icon={Icon.Plus}
                  onAction={handleCreateTodo}
                />
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => load(true)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {inProgress.length > 0 && (
        <List.Section
          title={`In Progress (${inProgress.length})`}
          subtitle="status: in-progress"
        >
          {inProgress.map((n) => (
            <NoteItem
              key={`inprogress-${n.path}`}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {upNext.length > 0 && (
        <List.Section
          title={`Up Next (${upNext.length})`}
          subtitle="status: next"
        >
          {upNext.map((n) => (
            <NoteItem
              key={`upnext-${n.path}`}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {todoItems.length > 0 && (
        <List.Section
          title={`Todo (${todoItems.length})`}
          subtitle="status: todo"
        >
          {todoItems.map((n) => (
            <NoteItem
              key={`todo-${n.path}`}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {holdStuck.length > 0 && (
        <List.Section
          title={`Hold/Stuck (${holdStuck.length})`}
          subtitle="status: hold/stuck"
        >
          {holdStuck.map((n) => (
            <NoteItem
              key={`hold-${n.path}`}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {waiting.length > 0 && (
        <List.Section
          title={`Waiting (${waiting.length})`}
          subtitle="status: waiting"
        >
          {waiting.map((n) => (
            <NoteItem
              key={`waiting-${n.path}`}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {someday.length > 0 && (
        <List.Section
          title={`Someday (${someday.length})`}
          subtitle="status: someday"
        >
          {someday.map((n) => (
            <NoteItem
              key={`someday-${n.path}`}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {!showCreateOption && todos.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Todos Found"
          description="Try refreshing or creating a new todo"
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => load(true)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function SetStatusForm({
  note,
  onStatusUpdated,
}: {
  note: Note;
  onStatusUpdated: () => void;
}) {
  const { pop } = useNavigation();
  const statuses = [
    { value: "todo", title: "Todo", icon: Icon.Circle },
    { value: "in-progress", title: "In Progress", icon: Icon.CircleProgress },
    { value: "next", title: "Up Next", icon: Icon.ArrowRight },
    { value: "hold/stuck", title: "Hold/Stuck", icon: Icon.Pause },
    { value: "waiting", title: "Waiting", icon: Icon.Clock },
    { value: "someday", title: "Someday", icon: Icon.Calendar },
    { value: "done", title: "Done", icon: Icon.CheckCircle },
    { value: "canceled", title: "Canceled", icon: Icon.XMarkCircle },
  ];

  async function handleStatusChange(newStatus: string) {
    try {
      await updateNoteStatus(note.path, newStatus);
      await showToast({
        style: Toast.Style.Success,
        title: `Set Status: ${newStatus}`,
        message: note.title,
      });
      onStatusUpdated();
      pop(); // Close the form and return to the main list
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  return (
    <List
      navigationTitle={`Set Status: ${note.title}`}
      searchBarPlaceholder="Choose new status..."
    >
      <List.Section title={`Current: ${note.status || "none"}`}>
        {statuses.map((s) => (
          <List.Item
            key={s.value}
            title={s.title}
            icon={s.icon}
            accessories={s.value === note.status ? [{ text: "Current" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={`Set to ${s.title}`}
                  icon={Icon.Checkmark}
                  onAction={() => handleStatusChange(s.value)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function SetProjectForm({
  note,
  onProjectUpdated,
}: {
  note: Note;
  onProjectUpdated: () => void;
}) {
  const { pop } = useNavigation();
  const prefs = getPreferenceValues<Prefs>();
  const [isLoading, setIsLoading] = useState(true);
  const [projectNotes, setProjectNotes] = useState<Note[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    async function loadProjects() {
      try {
        if (!prefs.basesProjectFile?.trim()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Project Base file not set",
          });
          return;
        }

        // Get project config from base file
        const projectConfig = await readBaseConfig(
          prefs.basesProjectFile.trim(),
        );

        if (!projectConfig || !projectConfig.vaultPath) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to parse Project Base file",
            message:
              "Check that your base file is valid and in an Obsidian vault",
          });
          return;
        }

        // Extract tags from project filters
        const projectTagFilters = projectConfig.filters.filter(
          (f) => f.property === "tags",
        );
        const projectTags = projectTagFilters.flatMap((f) =>
          f.values.map((v) => v.toLowerCase()),
        );

        // Use cached vault scan with filter instead of scanProjects
        const projectViewName = prefs.projectViewName?.trim() || "";
        const filterFn = (n: Note) => {
          const matches = evaluateWithView(projectConfig, n, projectViewName);
          if (!matches) return null;
          return { ...n, hasProjectTag: true };
        };

        const scanned = await scanVault({
          vaultPath: projectConfig.vaultPath,
          todoTags: [],
          projectTags,
          useCache: true,
          filterFn,
          maxAge: 5 * 60 * 1000,
        });

        const notes = scanned.filter((n) => n.hasProjectTag);
        setProjectNotes(notes);
      } catch (error: unknown) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message: String((error as Error)?.message ?? error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Filter projects by search text
  const filteredProjects = useMemo(() => {
    if (!searchText.trim()) return projectNotes;
    const searchLower = searchText.trim().toLowerCase();
    return projectNotes.filter((proj) =>
      proj.title.toLowerCase().includes(searchLower),
    );
  }, [projectNotes, searchText]);

  // Group by status
  const planning = useMemo(
    () =>
      filteredProjects
        .filter((n) => n.status === "planning")
        .sort(sortByMtimeDesc),
    [filteredProjects],
  );
  const research = useMemo(
    () =>
      filteredProjects
        .filter((n) => n.status === "research")
        .sort(sortByMtimeDesc),
    [filteredProjects],
  );
  const upNext = useMemo(
    () =>
      filteredProjects
        .filter((n) => n.status === "up-next" || n.status === "up next")
        .sort(sortByMtimeDesc),
    [filteredProjects],
  );
  const inProgress = useMemo(
    () =>
      filteredProjects
        .filter((n) => n.status === "in-progress" || n.status === "active")
        .sort(sortByMtimeDesc),
    [filteredProjects],
  );
  const onHold = useMemo(
    () =>
      filteredProjects
        .filter(
          (n) =>
            n.status === "on-hold" ||
            n.status === "hold" ||
            n.status === "paused",
        )
        .sort(sortByMtimeDesc),
    [filteredProjects],
  );
  const someday = useMemo(
    () =>
      filteredProjects
        .filter((n) => n.status === "someday")
        .sort(sortByMtimeDesc),
    [filteredProjects],
  );
  const other = useMemo(
    () =>
      filteredProjects
        .filter(
          (n) =>
            !n.status ||
            (n.status !== "planning" &&
              n.status !== "research" &&
              n.status !== "up-next" &&
              n.status !== "up next" &&
              n.status !== "in-progress" &&
              n.status !== "active" &&
              n.status !== "on-hold" &&
              n.status !== "hold" &&
              n.status !== "paused" &&
              n.status !== "someday"),
        )
        .sort(sortByMtimeDesc),
    [filteredProjects],
  );

  // Check if search text exactly matches any existing project
  const showCreateOption = useMemo(() => {
    if (!searchText.trim()) return false;
    const searchLower = searchText.trim().toLowerCase();
    return !projectNotes.some(
      (proj) => proj.title.toLowerCase() === searchLower,
    );
  }, [searchText, projectNotes]);

  async function handleSelectProject(projectName: string) {
    try {
      await updateNoteProject(note.path, projectName);
      await showToast({
        style: Toast.Style.Success,
        title: "Project Set",
        message: note.title,
      });
      onProjectUpdated();
      pop();
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  async function handleCreateAndSet() {
    if (!searchText.trim()) return;

    try {
      if (!prefs.basesProjectFile?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Project Base file not set",
        });
        return;
      }

      // Get project config from base file
      const projectConfig = await readBaseConfig(prefs.basesProjectFile.trim());

      if (!projectConfig || !projectConfig.vaultPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to parse Project Base file",
          message:
            "Check that your base file is valid and in an Obsidian vault",
        });
        return;
      }

      // Extract all tags from tag filters
      const projectTagFilters = projectConfig.filters.filter(
        (f) => f.property === "tags",
      );
      if (
        projectTagFilters.length === 0 ||
        projectTagFilters[0].values.length === 0
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No tags found in Project Base file",
          message: "Base file must contain at least one tag filter",
        });
        return;
      }

      const projectTags = projectTagFilters.flatMap((f) => f.values);

      // Create new project note (no dates - set later via actions)
      await createProjectNote(
        projectConfig.vaultPath,
        searchText.trim(),
        projectTags,
      );

      // Set it on the todo
      await updateNoteProject(note.path, searchText.trim());

      await showToast({
        style: Toast.Style.Success,
        title: "Project Created & Set",
        message: note.title,
      });
      onProjectUpdated();
      pop();
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  async function handleClear() {
    try {
      await updateNoteProject(note.path, "");
      await showToast({
        style: Toast.Style.Success,
        title: "Project Cleared",
        message: note.title,
      });
      onProjectUpdated();
      pop();
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Set Project: ${note.title}`}
      searchBarPlaceholder="Type @project or search..."
      onSearchTextChange={(text) => {
        const cleanText = text.startsWith("@") ? text.slice(1) : text;
        setSearchText(cleanText);
      }}
      searchText={searchText}
    >
      {showCreateOption && (
        <List.Section title="Create New">
          <List.Item
            title={`Create New Project: "${searchText.trim()}"`}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Create & Set Project"
                  icon={Icon.Plus}
                  onAction={handleCreateAndSet}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title={`Current: ${note.project || "none"}`}>
        {note.project && (
          <List.Item
            title="Clear Project"
            icon={Icon.Trash}
            actions={
              <ActionPanel>
                <Action
                  title="Clear Project"
                  icon={Icon.Trash}
                  onAction={handleClear}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      {planning.length > 0 && (
        <List.Section title={`Planning (${planning.length})`}>
          {planning.map((proj) => (
            <List.Item
              key={proj.path}
              title={proj.title}
              icon={Icon.Folder}
              accessories={
                proj.title === note.project ? [{ text: "Current" }] : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set Project"
                    icon={Icon.Checkmark}
                    onAction={() => handleSelectProject(proj.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {research.length > 0 && (
        <List.Section title={`Research (${research.length})`}>
          {research.map((proj) => (
            <List.Item
              key={proj.path}
              title={proj.title}
              icon={Icon.Folder}
              accessories={
                proj.title === note.project ? [{ text: "Current" }] : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set Project"
                    icon={Icon.Checkmark}
                    onAction={() => handleSelectProject(proj.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {upNext.length > 0 && (
        <List.Section title={`Up Next (${upNext.length})`}>
          {upNext.map((proj) => (
            <List.Item
              key={proj.path}
              title={proj.title}
              icon={Icon.Folder}
              accessories={
                proj.title === note.project ? [{ text: "Current" }] : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set Project"
                    icon={Icon.Checkmark}
                    onAction={() => handleSelectProject(proj.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {inProgress.length > 0 && (
        <List.Section title={`In Progress (${inProgress.length})`}>
          {inProgress.map((proj) => (
            <List.Item
              key={proj.path}
              title={proj.title}
              icon={Icon.Folder}
              accessories={
                proj.title === note.project ? [{ text: "Current" }] : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set Project"
                    icon={Icon.Checkmark}
                    onAction={() => handleSelectProject(proj.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {onHold.length > 0 && (
        <List.Section title={`On Hold (${onHold.length})`}>
          {onHold.map((proj) => (
            <List.Item
              key={proj.path}
              title={proj.title}
              icon={Icon.Folder}
              accessories={
                proj.title === note.project ? [{ text: "Current" }] : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set Project"
                    icon={Icon.Checkmark}
                    onAction={() => handleSelectProject(proj.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {someday.length > 0 && (
        <List.Section title={`Someday (${someday.length})`}>
          {someday.map((proj) => (
            <List.Item
              key={proj.path}
              title={proj.title}
              icon={Icon.Folder}
              accessories={
                proj.title === note.project ? [{ text: "Current" }] : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set Project"
                    icon={Icon.Checkmark}
                    onAction={() => handleSelectProject(proj.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {other.length > 0 && (
        <List.Section title={`Other (${other.length})`}>
          {other.map((proj) => (
            <List.Item
              key={proj.path}
              title={proj.title}
              icon={Icon.Folder}
              accessories={
                proj.title === note.project ? [{ text: "Current" }] : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set Project"
                    icon={Icon.Checkmark}
                    onAction={() => handleSelectProject(proj.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function EditTitleForm({
  note,
  onTitleUpdated,
}: {
  note: Note;
  onTitleUpdated: () => void;
}) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(note.title);

  async function handleSubmit() {
    try {
      await updateNoteTitle(note.path, title);
      await showToast({
        style: Toast.Style.Success,
        title: "Title Updated",
        message: title,
      });
      pop();
      onTitleUpdated();
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Title" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
    </Form>
  );
}

function NoteItem({
  note,
  onRefresh,
  onRebuild,
}: {
  note: Note;
  onRefresh: () => void;
  onRebuild: () => void;
}) {
  const prefs = getPreferenceValues<Prefs>();
  const accessories = [];

  // Priority (shown first if enabled)
  if (prefs.showPriority !== false && note.priority) {
    accessories.push({ text: note.priority, icon: Icon.Flag });
  }

  // Due date
  if (note.dateDue) {
    const overdue = isOverdue(note.dateDue);
    const today = isToday(note.dateDue);
    let iconColor: Color | undefined = undefined;
    if (overdue) {
      iconColor = Color.Red;
    } else if (today) {
      iconColor = Color.Green;
    }
    accessories.push({
      text: formatDate(note.dateDue),
      icon: { source: Icon.Calendar, tintColor: iconColor },
    });
  }

  // Recurrence info
  if (prefs.showRecurrence !== false && note.recurrence) {
    const recurrenceIcon =
      note.recurrenceAnchor === "completion" ? Icon.Repeat : Icon.Calendar;
    accessories.push({
      text: note.recurrence,
      icon: recurrenceIcon,
      tooltip: note.recurrenceAnchor
        ? `Recurs from ${note.recurrenceAnchor}`
        : undefined,
    });
  }

  // Time tracking
  if (prefs.showTimeTracking && (note.timeTracked || note.timeEstimate)) {
    const timeText =
      note.timeTracked && note.timeEstimate
        ? `${note.timeTracked}h / ${note.timeEstimate}h`
        : note.timeTracked
          ? `${note.timeTracked}h tracked`
          : `${note.timeEstimate}h est`;
    accessories.push({ text: timeText, icon: Icon.Clock });
  }

  // Project
  if (note.project) {
    accessories.push({ text: note.project, icon: Icon.Folder });
  }

  // Status
  if (note.status) {
    accessories.push({ text: note.status });
  }

  // Determine icon based on status
  let itemIcon = Icon.Circle; // default for todo/open/not started
  if (note.status === "in-progress") {
    itemIcon = Icon.CircleProgress;
  } else if (note.status === "next" || note.status === "up next") {
    itemIcon = Icon.ArrowRight;
  } else if (
    note.status === "hold/stuck" ||
    note.status === "stuck" ||
    note.status === "hold"
  ) {
    itemIcon = Icon.Pause;
  } else if (note.status === "waiting") {
    itemIcon = Icon.Clock;
  } else if (note.status === "someday") {
    itemIcon = Icon.Calendar;
  } else if (note.status === "done") {
    itemIcon = Icon.CheckCircle;
  } else if (note.status === "canceled") {
    itemIcon = Icon.XMarkCircle;
  }

  async function handleDateChange(
    field: string,
    fieldLabel: string,
    date: Date | null,
  ) {
    try {
      await updateNoteDate(note.path, field, date);
      await showToast({
        style: Toast.Style.Success,
        title: `${fieldLabel} Updated`,
        message: note.title,
      });
      onRefresh();
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  async function handleDelete() {
    try {
      const confirmed = await confirmAlert({
        title: "Delete Note",
        message: `Are you sure you want to delete "${note.title}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (!confirmed) return;

      const fs = await import("fs/promises");
      await fs.unlink(note.path);

      await showToast({
        style: Toast.Style.Success,
        title: "Note Deleted",
        message: note.title,
      });

      onRefresh();
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  return (
    <List.Item
      title={note.title}
      icon={itemIcon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Set Status"
            icon={Icon.Pencil}
            target={<SetStatusForm note={note} onStatusUpdated={onRefresh} />}
          />
          <Action.Push
            title="Set Project"
            icon={Icon.Folder}
            target={<SetProjectForm note={note} onProjectUpdated={onRefresh} />}
          />
          <Action.Push
            title="Edit Title"
            icon={Icon.Pencil}
            target={<EditTitleForm note={note} onTitleUpdated={onRefresh} />}
          />
          <ActionPanel.Submenu title="Set Priority" icon={Icon.Flag}>
            <Action
              title="1 - Urgent"
              icon={Icon.ExclamationMark}
              onAction={async () => {
                await updateNotePriority(note.path, "1-urgent");
                await showToast({
                  style: Toast.Style.Success,
                  title: "Priority Set",
                  message: "1 - Urgent",
                });
                onRefresh();
              }}
            />
            <Action
              title="2 - High"
              icon={Icon.Flag}
              onAction={async () => {
                await updateNotePriority(note.path, "2-high");
                await showToast({
                  style: Toast.Style.Success,
                  title: "Priority Set",
                  message: "2 - High",
                });
                onRefresh();
              }}
            />
            <Action
              title="3 - Medium"
              icon={Icon.Circle}
              onAction={async () => {
                await updateNotePriority(note.path, "3-medium");
                await showToast({
                  style: Toast.Style.Success,
                  title: "Priority Set",
                  message: "3 - Medium",
                });
                onRefresh();
              }}
            />
            <Action
              title="4 - Low"
              icon={Icon.Minus}
              onAction={async () => {
                await updateNotePriority(note.path, "4-low");
                await showToast({
                  style: Toast.Style.Success,
                  title: "Priority Set",
                  message: "4 - Low",
                });
                onRefresh();
              }}
            />
            <Action
              title="Clear Priority"
              icon={Icon.XMarkCircle}
              onAction={async () => {
                await updateNotePriority(note.path, "");
                await showToast({
                  style: Toast.Style.Success,
                  title: "Priority Cleared",
                });
                onRefresh();
              }}
            />
          </ActionPanel.Submenu>
          <Action.PickDate
            title="Set Due Date"
            icon={Icon.Calendar}
            onChange={(date) => handleDateChange("date_due", "Due Date", date)}
          />
          <Action.PickDate
            title="Set Start Date"
            icon={Icon.PlayFilled}
            onChange={(date) =>
              handleDateChange("date_started", "Start Date", date)
            }
          />
          <Action
            title="Mark as Done"
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              await updateNoteStatus(note.path, "done");
              await showToast({
                style: Toast.Style.Success,
                title: "Marked as Done",
                message: note.title,
              });
              onRefresh();
            }}
          />
          <Action.OpenInBrowser
            title="Open in Obsidian"
            url={`obsidian://open?path=${encodeURIComponent(note.path)}`}
            icon={Icon.Document}
          />
          <Action.ShowInFinder path={note.path} />
          <Action.CopyToClipboard title="Copy Path" content={note.path} />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
          <Action
            title="Rebuild Cache"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
              await showToast({
                style: Toast.Style.Animated,
                title: "Rebuilding cache...",
              });
              await onRebuild();
            }}
          />
          <Action
            title="Delete Note"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
}
