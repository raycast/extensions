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
  updateNotePriority,
  updateNoteTitle,
  createProjectNote,
} from "./utils";
import { readBaseConfig, evaluateWithView } from "./bases";
import { clearVaultCache } from "./cache";

type Prefs = {
  basesProjectFile: string;
  projectViewName: string;
};

function formatDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
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
      today.setHours(0, 0, 0, 0);
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

  async function load(rebuildCache = false) {
    try {
      setIsLoading(true);

      if (!prefs.basesProjectFile?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Set Project Base File in Preferences",
        });
        setNotes([]);
        return;
      }

      // Read configuration from Project Base file
      const projectConfig = await readBaseConfig(prefs.basesProjectFile.trim());

      if (!projectConfig) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to parse Project Base file",
          message: "Check that your base file is valid YAML",
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
      const projectTagFilters = projectConfig.filters.filter(
        (f) => f.property === "tags",
      );

      // Scan the vault with inline filtering
      const projectViewName = prefs.projectViewName.trim();

      const filterFn = (note: Note) => {
        // Apply filters during scan to avoid loading all files into memory
        const matchesProject = evaluateWithView(
          projectConfig,
          note,
          projectViewName,
        );

        if (!matchesProject) return null;

        return {
          ...note,
          hasTodoTag: false,
          hasProjectTag: matchesProject,
        };
      };

      // Clear cache if rebuild requested
      if (rebuildCache) {
        clearVaultCache(projectConfig.vaultPath);
      }

      // Extract tags from base config for early filtering
      const projectTags = projectTagFilters.flatMap((f) => f.values);

      // Scan vault with Raycast Cache enabled
      const scanned = await scanVault({
        vaultPath: projectConfig.vaultPath,
        todoTags: [],
        projectTags,
        useCache: true, // ✅ Enable Raycast Cache API
        filterFn,
        maxAge: 5 * 60 * 1000, // 5 minutes
      });

      // Update UI first (fast!)
      setNotes(scanned);
      setIsLoading(false);

      // Fire-and-forget toast (non-blocking, won't be cancelled)
      void showToast({
        style: Toast.Style.Success,
        title: `✓ Loaded ${scanned.length} projects`,
      });
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load",
        message: String((e as Error)?.message ?? e),
      });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateProject() {
    try {
      if (!prefs.basesProjectFile?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Set Project Base File in Preferences",
        });
        return;
      }

      // Read configuration from Project Base file
      const projectConfig = await readBaseConfig(prefs.basesProjectFile.trim());

      if (!projectConfig) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to parse Project Base file",
          message: "Check that your base file is valid YAML",
        });
        return;
      }

      if (!projectConfig.vaultPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not find vault for Project Base file",
          message: "Base file must be inside an Obsidian vault",
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

      // Create new project note (pass cached notes for fast folder detection)
      const newNotePath = await createProjectNote(
        projectConfig.vaultPath,
        searchText.trim(),
        projectTags,
        undefined,
        undefined,
        notes,
      );

      // Create a Note object for the new project to add to state immediately
      const newNote: Note = {
        title: searchText.trim(),
        path: newNotePath,
        relativePath: newNotePath.replace(projectConfig.vaultPath + "/", ""),
        tags: projectTags.map((t) => t.toLowerCase()),
        mtimeMs: Date.now(),
        hasTodoTag: false,
        hasProjectTag: true,
        status: "planning",
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
        title: "Project Created",
        message: searchText.trim(),
      });

      // Clear search
      setSearchText("");

      // Clear cache in background so next reload gets fresh data
      clearVaultCache(projectConfig.vaultPath);
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: String((error as Error)?.message ?? error),
      });
    }
  }

  // Filter projects by search text
  const filteredProjects = useMemo(() => {
    const projects = notes.filter((n) => n.hasProjectTag);
    if (!searchText.trim()) return projects;
    const searchLower = searchText.trim().toLowerCase();
    return projects.filter((n) => n.title.toLowerCase().includes(searchLower));
  }, [notes, searchText]);

  // Group projects by status
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
  const projects = useMemo(() => notes.filter((n) => n.hasProjectTag), [notes]);
  const showCreateOption = useMemo(() => {
    if (!searchText.trim()) return false;
    const searchLower = searchText.trim().toLowerCase();
    return !projects.some(
      (project) => project.title.toLowerCase() === searchLower,
    );
  }, [searchText, projects]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects by title…"
      onSearchTextChange={setSearchText}
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
                  title="Create Project"
                  icon={Icon.Plus}
                  onAction={handleCreateProject}
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
      {planning.length > 0 && (
        <List.Section
          title={`Planning (${planning.length})`}
          subtitle="status: planning"
        >
          {planning.map((n) => (
            <ProjectItem
              key={n.path}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {research.length > 0 && (
        <List.Section
          title={`Research (${research.length})`}
          subtitle="status: research"
        >
          {research.map((n) => (
            <ProjectItem
              key={n.path}
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
          subtitle="status: up-next"
        >
          {upNext.map((n) => (
            <ProjectItem
              key={n.path}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {inProgress.length > 0 && (
        <List.Section
          title={`In Progress (${inProgress.length})`}
          subtitle="status: in-progress"
        >
          {inProgress.map((n) => (
            <ProjectItem
              key={n.path}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {onHold.length > 0 && (
        <List.Section
          title={`On Hold (${onHold.length})`}
          subtitle="status: on-hold"
        >
          {onHold.map((n) => (
            <ProjectItem
              key={n.path}
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
            <ProjectItem
              key={n.path}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {other.length > 0 && (
        <List.Section title={`Other (${other.length})`}>
          {other.map((n) => (
            <ProjectItem
              key={n.path}
              note={n}
              onRefresh={() => load(true)}
              onRebuild={() => load(true)}
            />
          ))}
        </List.Section>
      )}
      {!showCreateOption && projects.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Projects Found"
          description="Try refreshing or creating a new project"
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
    { value: "planning", title: "Planning", icon: Icon.Pencil },
    { value: "research", title: "Research", icon: Icon.MagnifyingGlass },
    { value: "up-next", title: "Up Next", icon: Icon.ArrowRight },
    { value: "in-progress", title: "In Progress", icon: Icon.CircleProgress },
    { value: "on-hold", title: "On Hold", icon: Icon.Pause },
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
      pop();
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

function ProjectItem({
  note,
  onRefresh,
  onRebuild,
}: {
  note: Note;
  onRefresh: () => void;
  onRebuild: () => void;
}) {
  const accessories = [];
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
  if (note.status) {
    accessories.push({ text: note.status });
  }

  // Determine icon based on status
  let itemIcon = Icon.Folder;
  if (note.status === "planning") {
    itemIcon = Icon.Pencil;
  } else if (note.status === "research") {
    itemIcon = Icon.MagnifyingGlass;
  } else if (note.status === "up-next" || note.status === "up next") {
    itemIcon = Icon.ArrowRight;
  } else if (note.status === "in-progress" || note.status === "active") {
    itemIcon = Icon.CircleProgress;
  } else if (
    note.status === "on-hold" ||
    note.status === "hold" ||
    note.status === "paused"
  ) {
    itemIcon = Icon.Pause;
  } else if (note.status === "someday") {
    itemIcon = Icon.Calendar;
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
        title: "Delete Project",
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
        title: "Project Deleted",
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
            title="Delete Project"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
}
