// viewEntries.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
  Color,
  getPreferenceValues,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { TimeEntry, Project } from "./models";
import {
  getTimeEntries,
  deleteTimeEntry,
  saveTimeEntry,
  stopActiveTimer,
  getActiveTimer,
  getProjects,
  saveProject,
} from "./storage";
import {
  formatDuration,
  calculateDuration,
  roundDuration,
  groupEntriesByMonth,
  calculateMonthlyHoursSummary,
  generateId,
} from "./utils";
import { getProgressIcon, useLocalStorage, showFailureToast } from "@raycast/utils";

// Preferences interface
interface Preferences {
  roundingInterval: string;
}

// Simple date formatter (DD/MM)
function formatSimpleDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

// Get just the natural part of the date (Today, Yesterday, or day name for current week only)
function getNaturalDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time components for accurate day comparison
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Check if date is today
  if (inputDate.getTime() === todayDate.getTime()) {
    return "Today";
  }

  // Check if date is yesterday
  if (inputDate.getTime() === yesterdayDate.getTime()) {
    return "Yesterday";
  }

  // Get the current week's start and end dates
  // Assuming week starts on Monday (1) and ends on Sunday (0)
  const dayOfWeek = todayDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const startOfWeek = new Date(todayDate);
  // Go back to Monday (or Sunday if today is Sunday)
  startOfWeek.setDate(todayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  // Check if date is within the current week
  if (inputDate >= startOfWeek && inputDate <= endOfWeek) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayNames[inputDate.getDay()];
  }

  // For older dates or future dates, just return empty string (will only show DD/MM)
  return "";
}

// Project Form (simplified version of the one in trackProjects.tsx)
function ProjectForm({ project, onSave }: { project?: Project; onSave: () => Promise<void> }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [projectName, setProjectName] = useState<string>(project?.name || "");
  const [selectedColor, setSelectedColor] = useState<string>(project?.color || Color.Blue);
  const { pop } = useNavigation();

  const predefinedColors = [
    { label: "Red", value: Color.Red },
    { label: "Orange", value: Color.Orange },
    { label: "Yellow", value: Color.Yellow },
    { label: "Green", value: Color.Green },
    { label: "Blue", value: Color.Blue },
    { label: "Purple", value: Color.Purple },
    { label: "Magenta", value: Color.Magenta },
  ];

  async function handleSubmit() {
    // Validation
    if (!projectName || projectName.trim() === "") {
      setNameError("Project name is required");
      return;
    }

    try {
      const newProject: Project = {
        id: project?.id || generateId(),
        name: projectName.trim(),
        color: selectedColor,
        createdAt: project?.createdAt || new Date().toISOString(),
      };

      await saveProject(newProject);

      showToast({
        style: Toast.Style.Success,
        title: project ? "Project Updated" : "Project Created",
      });

      await onSave();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save project",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save Project" icon={Icon.Check} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter project name"
        value={projectName}
        onChange={(value) => {
          setProjectName(value);
          if (value && value.trim() !== "") {
            setNameError(undefined);
          }
        }}
        error={nameError}
        autoFocus={true}
      />

      <Form.Dropdown id="color" title="Color" value={selectedColor} onChange={setSelectedColor} storeValue={true}>
        {predefinedColors.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            value={color.value}
            title={color.label}
            icon={{ source: Icon.Dot, tintColor: color.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

// Add Time Log Form
function AddTimeLogForm({ onSave }: { onSave: () => Promise<void> }) {
  // Get the rounding interval from preferences
  const { roundingInterval } = getPreferenceValues<Preferences>();
  const roundingIntervalNum = parseInt(roundingInterval, 10) || 15;

  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>("none");
  const [dropdownValue, setDropdownValue] = useState<string | undefined>("none");
  const [description, setDescription] = useState<string>("");
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [startDateTime, setStartDateTime] = useState<Date>(new Date());
  const [endDateTime, setEndDateTime] = useState<Date>(
    new Date(new Date().getTime() + roundingIntervalNum * 60 * 1000),
  ); // Initialize with start time + rounding interval
  const [duration, setDuration] = useState<string>(() => {
    // Format the default rounding interval as HH:MM
    const hours = Math.floor(roundingIntervalNum / 60);
    const mins = roundingIntervalNum % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  });
  const [durationError, setDurationError] = useState<string | undefined>();

  const { pop, push } = useNavigation();

  useEffect(() => {
    loadProjects();
  }, []);

  // Load projects asynchronously
  async function loadProjects() {
    try {
      setIsLoading(true);
      const allProjects = await getProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading data:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Update end date when start date or duration changes
  useEffect(() => {
    if (startDateTime && duration && /^([0-9]{1,2}):([0-5][0-9])$/.test(duration)) {
      try {
        // Parse HH:MM format
        const [hoursStr, minsStr] = duration.split(":");
        const hours = parseInt(hoursStr, 10);
        const mins = parseInt(minsStr, 10);
        const durationMinutes = hours * 60 + mins;

        if (durationMinutes > 0) {
          const newEndTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
          setEndDateTime(newEndTime);
          setDurationError(undefined);
        }
      } catch {
        // Invalid time or duration, don't update end time
        setDurationError("Please enter a valid duration in HH:MM format");
      }
    }
  }, [startDateTime, duration]);

  // Handle project creation and selection
  const handleProjectCreated = async () => {
    try {
      setIsLoading(true);
      const allProjects = await getProjects();
      setProjects(allProjects);

      if (allProjects.length > 0) {
        const latestProject = allProjects[allProjects.length - 1];
        setSelectedProjectId(latestProject.id);
        setDropdownValue(latestProject.id);
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to load updated projects" });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the function to handle project selection
  const handleProjectChange = (value: string) => {
    if (value === "create_new") {
      push(<ProjectForm onSave={handleProjectCreated} />);
    } else {
      setSelectedProjectId(value === "none" ? undefined : value);
      setDropdownValue(value);
    }
  };

  // Update duration field (end time is recalculated via useEffect)
  function handleDurationChange(value: string) {
    // Accept any input while typing, only validate format on complete entries
    setDuration(value);

    // Clear error if empty (will be validated on submit)
    if (value === "") {
      setDurationError(undefined);
      return;
    }

    // Only check for valid format when we have what looks like a complete HH:MM entry
    if (value.includes(":") && value.length >= 3) {
      // Validate complete entries against HH:MM format
      if (/^([0-9]{1,2}):([0-5][0-9])$/.test(value)) {
        setDurationError(undefined);
        // Trigger the useEffect to calculate end time
      } else {
        setDurationError("Please enter a valid time in HH:MM format");
      }
    } else {
      // For partial entries, don't show an error
      setDurationError(undefined);
    }
  }

  // Handle start date change - preserve duration and recalculate end time via useEffect
  function handleStartDateChange(newValue: Date | null) {
    if (newValue) {
      setStartDateTime(newValue);
      // End time will be recalculated by the useEffect
    }
  }

  // Handle description changes
  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    // Clear error when description is not empty
    if (value && value.trim() !== "") {
      setDescriptionError(undefined);
    }
  };

  // Submit the form
  async function handleSubmit() {
    try {
      if (!startDateTime) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Start Time",
          message: "Enter a valid start date and time",
        });
        return;
      }

      if (!duration || duration === "") {
        setDurationError("Please enter a valid duration in HH:MM format");
        return;
      }

      if (!/^([0-9]{1,2}):([0-5][0-9])$/.test(duration)) {
        setDurationError("Please enter a valid duration in HH:MM format");
        return;
      }

      // Calculate the end time from start time and duration
      const [hoursStr, minsStr] = duration.split(":");
      const hours = parseInt(hoursStr, 10);
      const mins = parseInt(minsStr, 10);
      const durationMinutes = hours * 60 + mins;

      const roundedDuration = roundDuration(durationMinutes, roundingIntervalNum);
      const endDateTimeToSave = new Date(startDateTime.getTime() + roundedDuration * 60 * 1000);

      let projectId: string | undefined = undefined;
      if (selectedProjectId === "none" || selectedProjectId === undefined) {
        // Explicitly set to Unassigned
        projectId = undefined;
      } else {
        // Set to a specific project
        projectId = selectedProjectId;
      }

      const newLog: TimeEntry = {
        id: generateId(),
        description: description.trim() || null,
        startTime: startDateTime,
        endTime: endDateTimeToSave,
        isActive: false,
        createdAt: new Date().toISOString(),
        projectId: projectId,
      };

      await saveTimeEntry(newLog);
      await onSave();

      showToast({
        style: Toast.Style.Success,
        title: "Time Log Added",
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add time log",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Save Time Log" icon={Icon.Check} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Task"
        placeholder="What did you work on?"
        value={description}
        onChange={handleDescriptionChange}
        error={descriptionError}
      />

      <Form.Dropdown
        id="project"
        title="Project"
        onChange={handleProjectChange}
        storeValue={false}
        value={dropdownValue || "none"}
      >
        <Form.Dropdown.Item
          value="none"
          title="Unassigned"
          icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
        />
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.name}
            icon={{ source: Icon.Dot, tintColor: project.color || Color.PrimaryText }}
          />
        ))}
        <Form.Dropdown.Section title="Actions">
          <Form.Dropdown.Item value="create_new" title="Create New Project..." icon={Icon.Plus} />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="Enter duration as HH:MM"
        value={duration}
        onChange={handleDurationChange}
        error={durationError}
        info={`It'll round up to ${roundingIntervalNum}min interval.`}
      />

      <Form.Separator />

      <Form.DatePicker
        id="startDateTime"
        title="Start Date & Time"
        value={startDateTime}
        onChange={handleStartDateChange}
        type={Form.DatePicker.Type.DateTime}
      />

      <Form.DatePicker
        id="endDateTime"
        title="End Date & Time"
        value={endDateTime}
        onChange={() => {}} // No-op to make it effectively read-only
        type={Form.DatePicker.Type.DateTime}
        info="Automatically calculated based on start time and duration."
      />
    </Form>
  );
}

// Edit Time Log Form
function EditTimeLogForm({ entry, onSave }: { entry: TimeEntry; onSave: () => Promise<void> }) {
  // Get the rounding interval from preferences
  const { roundingInterval } = getPreferenceValues<Preferences>();
  const roundingIntervalNum = parseInt(roundingInterval, 10) || 15;

  // Form state
  const [description, setDescription] = useState(entry.description || "");
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [startDateTime, setStartDateTime] = useState(new Date(entry.startTime));
  const [endDateTime, setEndDateTime] = useState(
    entry.endTime
      ? new Date(entry.endTime)
      : new Date(new Date(entry.startTime).getTime() + roundingIntervalNum * 60 * 1000),
  );
  const [duration, setDuration] = useState(() => {
    if (entry.endTime) {
      const durationMinutes = Math.round(calculateDuration(new Date(entry.startTime), new Date(entry.endTime)));
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    } else {
      const hours = Math.floor(roundingIntervalNum / 60);
      const mins = roundingIntervalNum % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    }
  });
  const [durationError, setDurationError] = useState<string | undefined>();

  // Project loading state
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(entry.projectId || "none");
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  const { pop, push } = useNavigation();

  // Load projects
  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      try {
        const allProjects = await getProjects();

        if (!isMounted) return;

        setProjects(allProjects);

        // Set the initial project selection only if an entry has a project
        if (entry.projectId) {
          const projectExists = allProjects.some((p) => p.id === entry.projectId);

          if (projectExists) {
            setSelectedProjectId(entry.projectId);
          }
        }

        // Mark projects as loaded - for conditional rendering
        setProjectsLoaded(true);
      } catch (error) {
        if (isMounted) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load projects",
            message: String(error),
          });
          // Set loaded even on error to show dropdown
          setProjectsLoaded(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [entry.projectId]);

  // Handle project creation
  const handleProjectCreated = async () => {
    setIsLoading(true);
    try {
      const allProjects = await getProjects();
      setProjects(allProjects);

      // Select the latest project
      if (allProjects.length > 0) {
        const latestProject = allProjects[allProjects.length - 1];
        setSelectedProjectId(latestProject.id);
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to reload projects" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle project selection
  const handleProjectChange = (value: string) => {
    if (value === "create_new") {
      push(<ProjectForm onSave={handleProjectCreated} />);
    } else {
      setSelectedProjectId(value === "none" ? undefined : value);
    }
  };

  // Update end date when start date or duration changes
  useEffect(() => {
    if (startDateTime && duration && /^([0-9]{1,2}):([0-5][0-9])$/.test(duration)) {
      try {
        // Parse HH:MM format
        const [hoursStr, minsStr] = duration.split(":");
        const hours = parseInt(hoursStr, 10);
        const mins = parseInt(minsStr, 10);
        const durationMinutes = hours * 60 + mins;

        if (durationMinutes > 0) {
          const newEndTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
          setEndDateTime(newEndTime);
          setDurationError(undefined);
        }
      } catch {
        // Invalid time or duration, don't update end time
        setDurationError("Please enter a valid duration in HH:MM format");
      }
    }
  }, [startDateTime, duration]);

  // Handle duration changes
  function handleDurationChange(value: string) {
    // Accept any input while typing, only validate format on complete entries
    setDuration(value);

    // Clear error if empty (will be validated on submit)
    if (value === "") {
      setDurationError(undefined);
      return;
    }

    // Only check for valid format when we have what looks like a complete HH:MM entry
    if (value.includes(":") && value.length >= 3) {
      // Validate complete entries against HH:MM format
      if (/^([0-9]{1,2}):([0-5][0-9])$/.test(value)) {
        setDurationError(undefined);
        // Trigger the useEffect to calculate end time
      } else {
        setDurationError("Please enter a valid time in HH:MM format");
      }
    } else {
      // For partial entries, don't show an error
      setDurationError(undefined);
    }
  }

  // Handle start date change - preserve duration and recalculate end time via useEffect
  function handleStartDateChange(newValue: Date | null) {
    if (newValue) {
      setStartDateTime(newValue);
      // End time will be recalculated by the useEffect
    }
  }

  // Handle description changes
  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    // Clear error when description is not empty
    if (value && value.trim() !== "") {
      setDescriptionError(undefined);
    }
  };

  // Submit handler
  async function handleSubmit() {
    try {
      if (!startDateTime) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Start Time",
          message: "Enter a valid start date and time",
        });
        return;
      }

      // Validate input
      if (!description || description.trim() === "") {
        setDescriptionError("Task description is required");
        return;
      }

      if (!duration || duration === "") {
        setDurationError("Please enter a valid duration in HH:MM format");
        return;
      }

      if (!/^([0-9]{1,2}):([0-5][0-9])$/.test(duration)) {
        setDurationError("Please enter a valid duration in HH:MM format");
        return;
      }

      let endDateTimeToSave: Date | null = null;

      // Calculate the end time from duration or use existing end time
      if (!entry.isActive) {
        // Parse HH:MM format
        const [hoursStr, minsStr] = duration.split(":");
        const hours = parseInt(hoursStr, 10);
        const mins = parseInt(minsStr, 10);
        const durationMinutes = hours * 60 + mins;

        const roundedDuration = roundDuration(durationMinutes, roundingIntervalNum);
        endDateTimeToSave = new Date(startDateTime.getTime() + roundedDuration * 60 * 1000);
      }

      let projectId: string | undefined = undefined;
      if (selectedProjectId === "none" || selectedProjectId === undefined) {
        // Explicitly set to Unassigned
        projectId = undefined;
      } else {
        // Set to a specific project
        projectId = selectedProjectId;
      }

      const updatedLog: TimeEntry = {
        ...entry,
        description: description.trim() || null,
        startTime: startDateTime,
        endTime: endDateTimeToSave,
        projectId: projectId,
      };

      await saveTimeEntry(updatedLog);
      await onSave();

      showToast({
        style: Toast.Style.Success,
        title: "Time Log Updated",
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update time log",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Save Time Log" icon={Icon.Check} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Task"
        placeholder="What did you work on?"
        value={description}
        onChange={handleDescriptionChange}
        error={descriptionError}
      />

      {/* Only show the dropdown when projects are loaded */}
      {projectsLoaded ? (
        <Form.Dropdown id="project" title="Project" value={selectedProjectId || "none"} onChange={handleProjectChange}>
          <Form.Dropdown.Item
            value="none"
            title="Unassigned"
            icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
          />
          {projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={project.name}
              icon={{ source: Icon.Dot, tintColor: project.color || Color.PrimaryText }}
            />
          ))}
          <Form.Dropdown.Section title="Actions">
            <Form.Dropdown.Item value="create_new" title="Create New Project..." icon={Icon.Plus} />
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : (
        <Form.Description text="Loading projects..." />
      )}

      {!entry.isActive && (
        <Form.TextField
          id="duration"
          title="Duration"
          placeholder="Enter duration as HH:MM"
          value={duration}
          onChange={handleDurationChange}
          error={durationError}
        />
      )}

      <Form.Separator />

      <Form.DatePicker
        id="startDateTime"
        title="Start Date & Time"
        value={startDateTime}
        onChange={handleStartDateChange}
        type={Form.DatePicker.Type.DateTime}
      />

      {!entry.isActive && (
        <Form.DatePicker
          id="endDateTime"
          title="End Date & Time"
          value={endDateTime}
          onChange={() => {}} // No-op to make it effectively read-only
          type={Form.DatePicker.Type.DateTime}
          info="Automatically calculated based on start time and duration."
        />
      )}
    </Form>
  );
}

// Calculate month progress (how many days have passed as percentage)
function getMonthProgress(monthDate: Date): number {
  const now = new Date();
  const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const totalDays = endOfMonth.getDate();

  // If we're viewing a past month, return 1 (100%)
  if (monthDate.getMonth() < now.getMonth() || monthDate.getFullYear() < now.getFullYear()) {
    return 1;
  }

  // If we're viewing a future month, return 0 (0%)
  if (monthDate.getMonth() > now.getMonth() || monthDate.getFullYear() > now.getFullYear()) {
    return 0;
  }

  // We're viewing the current month, calculate progress
  const daysPassed = now.getDate();
  return daysPassed / totalDays;
}

// Ensure consistent duration format for all entries
function formatConsistentDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  // Format as HH:MM
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Helper function to check if a date is in the current month
function isCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export default function ViewLogs() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [monthsToDisplay, setMonthsToDisplay] = useState<number>(3);
  const [activeTimerDuration, setActiveTimerDuration] = useState<string>("00:00");

  const { value: viewMode, setValue: setViewMode } = useLocalStorage<"detailed" | "monthly">(
    "time-tracker-view-mode",
    "detailed",
  );

  const { push } = useNavigation();

  // Use ref for current time to avoid re-renders
  const nowRef = useRef(new Date());
  // Store active timer duration as a ref to avoid re-renders
  const activeTimerDurationRef = useRef(0);

  // Update time every second and calculate duration without triggering re-renders
  useEffect(() => {
    const interval = setInterval(() => {
      nowRef.current = new Date();

      // Only calculate duration if there's an active timer
      if (activeTimer) {
        activeTimerDurationRef.current = calculateDuration(new Date(activeTimer.startTime), nowRef.current);

        // Update the display duration
        setActiveTimerDuration(formatDuration(activeTimerDurationRef.current));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Load active timer on component mount
  useEffect(() => {
    async function loadActiveTimer() {
      try {
        const timer = await getActiveTimer();
        if (timer) {
          setActiveTimer(timer);

          // Calculate initial duration
          const now = new Date();
          const duration = calculateDuration(new Date(timer.startTime), now);
          setActiveTimerDuration(formatDuration(duration));
        }
      } catch (error) {
        console.error("Error loading active timer:", error);
      }
    }

    loadActiveTimer();
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load time logs and active timer
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all projects and create a lookup map
      const projectsList = await getProjects();
      const projectsMap: Record<string, Project> = {};
      projectsList.forEach((project) => {
        projectsMap[project.id] = project;
      });
      setProjects(projectsMap);

      // Load time logs
      const logs = await getTimeEntries();
      logs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setTimeEntries(logs);

      // Load active timer
      const active = await getActiveTimer();
      setActiveTimer(active);

      // Initialize timer duration if needed
      if (active) {
        activeTimerDurationRef.current = calculateDuration(new Date(active.startTime), new Date());
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start a new timer with the same description as an existing time log
  async function startTimer(logDescription: string, projectId?: string) {
    try {
      // Stop any active timer first
      await stopActiveTimer();

      // Create new timer
      const newLog: TimeEntry = {
        id: generateId(),
        description: logDescription.trim() === "" ? null : logDescription.trim(),
        startTime: new Date(),
        endTime: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        projectId: projectId,
      };

      await saveTimeEntry(newLog);
      showToast({
        style: Toast.Style.Success,
        title: "Timer started",
      });

      // Refresh the data
      await loadData();
    } catch (error) {
      console.error("Error starting timer:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to start timer",
        message: String(error),
      });
    }
  }

  // Stop the active timer
  async function stopTimer() {
    try {
      const stoppedTimer = await stopActiveTimer();
      if (stoppedTimer) {
        showToast({
          style: Toast.Style.Success,
          title: "Timer stopped",
          message: "Time log saved",
        });
        await loadData();
      } else {
        // If no timer was returned, it might have been removed due to being too short
        showToast({
          style: Toast.Style.Failure,
          title: "Discarded!",
          message: "Entries shorter than 1 min are removed",
        });
        await loadData();
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop timer",
        message: String(error),
      });
    }
  }

  // Delete a time log
  async function deleteLog(logId: string) {
    try {
      // Find the log in the current data before deleting it
      const logToDelete = timeEntries.find((log) => log.id === logId);
      if (!logToDelete) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete Time Log",
        });
        return;
      }

      // Get project name - should always be present but TypeScript needs a check
      let projectName = "Unassigned";
      if (logToDelete.projectId && projects[logToDelete.projectId]) {
        projectName = projects[logToDelete.projectId].name;
      }

      // Delete the entry
      await deleteTimeEntry(logId);

      // Show success message with project and task
      showToast({
        style: Toast.Style.Success,
        title: `${projectName} — ${logToDelete.description} Time Log deleted`,
      });

      // Refresh data
      await loadData();
    } catch (error) {
      console.error("Error deleting time log:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete Time Log",
        message: String(error),
      });
    }
  }

  // Filter logs to only show the last X months
  const visibleLogs = useMemo(() => {
    if (!timeEntries || timeEntries.length === 0) return [];

    // Get current date
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Create date range for current month plus the last X-1 months
    // For example, if today is in March 2023 and monthsToDisplay is 2,
    // we show February 2023 and March 2023 (current month)

    // Calculate first day of first month to show (current month - (monthsToDisplay-1))
    const startMonth = currentMonth - (monthsToDisplay - 1);
    const startYear = currentYear + Math.floor(startMonth / 12);
    const normalizedStartMonth = ((startMonth % 12) + 12) % 12; // Handle negative month values

    // First day of the earliest month to show
    const cutoffDate = new Date(startYear, normalizedStartMonth, 1);
    cutoffDate.setHours(0, 0, 0, 0);

    // Last day of the current month
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    return timeEntries.filter((log) => {
      // Keep active timer regardless of date
      if (log.isActive) return true;

      const logDate = new Date(log.startTime);
      return logDate >= cutoffDate && logDate <= endDate;
    });
  }, [timeEntries, monthsToDisplay]);

  // Memoize the filtered time logs to prevent unnecessary recalculations
  const filteredLogs = useMemo(() => {
    return visibleLogs.filter((log) => {
      // Filter out active timer
      if (log.isActive) return false;

      // Apply text search filter
      if (searchText && (!log.description || !log.description.toLowerCase().includes(searchText.toLowerCase()))) {
        return false;
      }

      // Apply project filter
      if (filterProject !== "all" && log.projectId !== filterProject) {
        return false;
      }

      return true;
    });
  }, [visibleLogs, searchText, filterProject]);

  // Calculate monthly summary from filtered time logs (memoized)
  const monthlySummary = useMemo(() => {
    return calculateMonthlyHoursSummary(filteredLogs);
  }, [filteredLogs]);

  // Group time logs by month (memoized)
  const groupedLogs = useMemo(() => {
    return groupEntriesByMonth(filteredLogs);
  }, [filteredLogs]);

  // Modified: Group logs by month AND project for summary view while keeping month structure
  const groupedByMonthAndProject = useMemo(() => {
    if (viewMode === "detailed") return null;

    // First group by month similar to groupedLogs
    const monthGroups: Record<string, Record<string, Record<string, Record<string, TimeEntry[]>>>> = {};

    filteredLogs.forEach((log) => {
      const date = new Date(log.startTime);
      const monthKey = `${date.toLocaleString("en-US", { month: "long" })} ${date.getFullYear()}`;
      const dayKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      const projectKey = log.projectId || "unassigned";
      const taskKey = log.description || "Untitled Time Log";

      // Create month group if doesn't exist
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {};
      }

      // Create day group if doesn't exist
      if (!monthGroups[monthKey][dayKey]) {
        monthGroups[monthKey][dayKey] = {};
      }

      // Create project group if doesn't exist
      if (!monthGroups[monthKey][dayKey][projectKey]) {
        monthGroups[monthKey][dayKey][projectKey] = {};
      }

      // Create task group if doesn't exist
      if (!monthGroups[monthKey][dayKey][projectKey][taskKey]) {
        monthGroups[monthKey][dayKey][projectKey][taskKey] = [];
      }

      // Add log to the group
      monthGroups[monthKey][dayKey][projectKey][taskKey].push(log);
    });

    return monthGroups;
  }, [filteredLogs, viewMode]);

  // Get project options for filter dropdown
  const projectOptions = useMemo(() => {
    return Object.values(projects).map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color,
    }));
  }, [projects]);

  function getLogTitle(log: TimeEntry): string {
    const description = log.description || "Untitled Time Log";

    // When filtering by a specific project, just show the task name
    if (filterProject !== "all") {
      return description;
    }

    // Otherwise show project name + task name for all projects view
    if (!log.projectId) return description;

    const project = projects[log.projectId];
    if (!project) return description;

    return `${project.name} — ${description}`;
  }

  function getLogIcon(log: TimeEntry): Icon | { source: Icon; tintColor: string } {
    if (!log.projectId) return { source: Icon.Dot, tintColor: Color.SecondaryText };

    const project = projects[log.projectId];
    if (!project) return Icon.Clock;

    return { source: Icon.Dot, tintColor: project.color };
  }

  // Toggle view mode function to be used in action panels
  const toggleViewMode = useCallback(async () => {
    const newMode = viewMode === "detailed" ? "monthly" : "detailed";
    await setViewMode(newMode);
  }, [viewMode, setViewMode]);

  // Handler to load more months
  const handleLoadMoreMonths = useCallback(() => {
    setMonthsToDisplay((prev) => prev + 2);
  }, []);

  // Check if there are more logs to load
  const hasMoreLogs = useMemo(() => {
    // Count logs that are outside the current date range
    if (!timeEntries || timeEntries.length === 0) return false;

    // Get current date
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate first day of first month to show (current month - (monthsToDisplay-1))
    const startMonth = currentMonth - (monthsToDisplay - 1);
    const startYear = currentYear + Math.floor(startMonth / 12);
    const normalizedStartMonth = ((startMonth % 12) + 12) % 12; // Handle negative month values

    // First day of the earliest month to show
    const cutoffDate = new Date(startYear, normalizedStartMonth, 1);
    cutoffDate.setHours(0, 0, 0, 0);

    return timeEntries.some((log) => !log.isActive && new Date(log.startTime) < cutoffDate);
  }, [timeEntries, monthsToDisplay]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search time logs..."
      navigationTitle="Time Logs"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Project" value={filterProject} onChange={setFilterProject}>
          <List.Dropdown.Item title="All Projects" value="all" icon={Icon.Tag} />
          {projectOptions.map((project) => (
            <List.Dropdown.Item
              key={project.id}
              title={project.name}
              value={project.id}
              icon={{ source: Icon.Dot, tintColor: project.color }}
            />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Add New Time Log"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<AddTimeLogForm onSave={loadData} />)}
          />
          <Action
            title={viewMode === "detailed" ? "Switch to Daily Summary" : "Switch to Detailed View"}
            icon={viewMode === "detailed" ? Icon.Calendar : Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={toggleViewMode}
          />
        </ActionPanel>
      }
    >
      {/* Active Timer */}
      {activeTimer && (
        <List.Section title="Active Timer">
          <List.Item
            title={getLogTitle(activeTimer)}
            icon={getLogIcon(activeTimer)}
            accessories={[
              ...(getNaturalDateLabel(new Date(activeTimer.startTime))
                ? [{ text: getNaturalDateLabel(new Date(activeTimer.startTime)) }]
                : []),
              { text: formatSimpleDate(new Date(activeTimer.startTime)) },
              { text: activeTimerDuration },
            ]}
            actions={
              <ActionPanel>
                <Action title="Stop Timer" icon={Icon.Stop} onAction={stopTimer} />
                <Action
                  title="Edit Time Log"
                  icon={Icon.Pencil}
                  onAction={() => push(<EditTimeLogForm entry={activeTimer} onSave={loadData} />)}
                />
                <Action
                  title="Delete Time Log"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deleteLog(activeTimer.id)}
                />

                <ActionPanel.Section>
                  <Action
                    title="Add Time Log"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<AddTimeLogForm onSave={loadData} />)}
                  />
                  <Action
                    title={viewMode === "detailed" ? "Switch to Daily Summary" : "Switch to Detailed View"}
                    icon={viewMode === "detailed" ? Icon.Calendar : Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={toggleViewMode}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Time Logs By Month */}
      {viewMode === "detailed" ? (
        // Existing detailed view
        <>
          {Object.entries(groupedLogs).map(([groupName, groupLogs]) => {
            // Find the month data in monthlySummary to get the duration
            const monthData = monthlySummary.find((m) => m.label === groupName);
            const monthDuration = monthData ? formatConsistentDuration(monthData.minutes) : "00:00";

            // Extract date from the groupName (format is "Month Year")
            const dateParts = groupName.split(" ");
            const monthName = dateParts[0];
            const year = parseInt(dateParts[1], 10);
            const monthDate = new Date(year, new Date(Date.parse(monthName + " 1, " + year)).getMonth());

            // Calculate month progress
            const progress = getMonthProgress(monthDate);

            return (
              <List.Section key={groupName} title={groupName}>
                {/* Month header with duration on the right */}
                <List.Item
                  title="Total Hours"
                  icon={
                    isCurrentMonth(monthDate)
                      ? getProgressIcon(progress, "#000000")
                      : { source: Icon.Dot, tintColor: Color.PrimaryText }
                  }
                  accessories={[{ text: monthDuration }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Add Time Log"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={() => push(<AddTimeLogForm onSave={loadData} />)}
                      />
                      <Action
                        title="Switch to Daily Summary"
                        icon={Icon.Calendar}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={toggleViewMode}
                      />
                    </ActionPanel>
                  }
                />

                {/* Time log entries */}
                {(groupLogs as TimeEntry[]).map((log: TimeEntry) => {
                  const startDate = new Date(log.startTime);
                  let durationText = "";

                  if (log.endTime) {
                    const endDate = new Date(log.endTime);
                    const durationMinutes = calculateDuration(startDate, endDate);
                    durationText = formatConsistentDuration(durationMinutes);
                  } else {
                    durationText = "00:00";
                  }

                  return (
                    <List.Item
                      key={log.id}
                      title={getLogTitle(log)}
                      icon={getLogIcon(log)}
                      accessories={[
                        ...(getNaturalDateLabel(startDate) ? [{ text: getNaturalDateLabel(startDate) }] : []),
                        { text: formatSimpleDate(startDate) },
                        { text: durationText },
                      ]}
                      actions={
                        <ActionPanel>
                          <ActionPanel.Section title={getLogTitle(log)}>
                            <Action
                              title="Resume"
                              icon={Icon.Play}
                              onAction={() => startTimer(log.description || "", log.projectId)}
                            />
                            <Action
                              title="Edit Time Log"
                              icon={Icon.Pencil}
                              onAction={() => push(<EditTimeLogForm entry={log} onSave={loadData} />)}
                            />
                            <Action
                              title="Delete Time Log"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={{ modifiers: ["ctrl"], key: "x" }}
                              onAction={() => deleteLog(log.id)}
                            />
                          </ActionPanel.Section>

                          <ActionPanel.Section>
                            <Action
                              title="Add Time Log"
                              icon={Icon.Plus}
                              shortcut={{ modifiers: ["cmd"], key: "n" }}
                              onAction={() => push(<AddTimeLogForm onSave={loadData} />)}
                            />
                            <Action
                              title="Switch to Daily Summary"
                              icon={Icon.Calendar}
                              shortcut={{ modifiers: ["cmd"], key: "d" }}
                              onAction={toggleViewMode}
                            />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  );
                })}
              </List.Section>
            );
          })}

          {/* Load More button in detailed view */}
          {hasMoreLogs && (
            <List.Section title="Previous Months">
              <List.Item
                title="Load Previous Time Logs"
                icon={Icon.ChevronDownSmall}
                actions={
                  <ActionPanel>
                    <Action
                      title="Load Previous Time Logs"
                      icon={Icon.ChevronDownSmall}
                      onAction={handleLoadMoreMonths}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      ) : (
        // Summary view
        <>
          {Object.entries(groupedByMonthAndProject || {}).map(([monthName, dayGroups]) => {
            // Find the month data in monthlySummary to get the duration
            const monthData = monthlySummary.find((m) => m.label === monthName);
            const monthDuration = monthData ? formatConsistentDuration(monthData.minutes) : "00:00";

            // Extract date from the monthName (format is "Month Year")
            const dateParts = monthName.split(" ");
            const monthIndex = new Date(Date.parse(dateParts[0] + " 1, " + dateParts[1])).getMonth();
            const year = parseInt(dateParts[1], 10);
            const monthDate = new Date(year, monthIndex);

            // Calculate month progress
            const progress = getMonthProgress(monthDate);

            return (
              <List.Section key={monthName} title={monthName}>
                <List.Item
                  title="Total Hours"
                  icon={
                    isCurrentMonth(monthDate)
                      ? getProgressIcon(progress, "#000000")
                      : { source: Icon.Dot, tintColor: Color.PrimaryText }
                  }
                  accessories={[{ text: monthDuration }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Add Time Log"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={() => push(<AddTimeLogForm onSave={loadData} />)}
                      />
                      <Action
                        title="Switch to Detailed View"
                        icon={Icon.List}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={toggleViewMode}
                      />
                    </ActionPanel>
                  }
                />

                {/* Day groups */}
                {Object.entries(dayGroups)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([dayKey, projectGroups]) => {
                    const date = new Date(
                      parseInt(dayKey.split("-")[0], 10),
                      parseInt(dayKey.split("-")[1], 10) - 1,
                      parseInt(dayKey.split("-")[2], 10),
                    );

                    // Project groups for this day
                    return Object.entries(projectGroups)
                      .flatMap(([projectKey, taskGroups]) => {
                        // Get project info
                        const project = projectKey !== "unassigned" ? projects[projectKey] : null;
                        const projectName = project ? project.name : "Unassigned";
                        const projectColor = project ? project.color : Color.SecondaryText;

                        // Return task groups for this project
                        return Object.entries(taskGroups).map(([taskKey, logs]) => {
                          // Calculate total duration for this task
                          const totalMinutes = logs.reduce((total, log) => {
                            if (log.endTime) {
                              return total + calculateDuration(new Date(log.startTime), new Date(log.endTime));
                            }
                            return total;
                          }, 0);

                          return (
                            <List.Item
                              key={`${dayKey}-${projectKey}-${taskKey}`}
                              title={
                                filterProject !== "all" || projectKey === "unassigned"
                                  ? `${taskKey}${logs.length > 1 ? ` [x${logs.length}]` : ""}`
                                  : `${projectName} — ${taskKey}${logs.length > 1 ? ` [x${logs.length}]` : ""}`
                              }
                              icon={{ source: Icon.Dot, tintColor: projectColor }}
                              accessories={[
                                ...(getNaturalDateLabel(date) ? [{ text: getNaturalDateLabel(date) }] : []),
                                { text: formatSimpleDate(date) },
                                { text: formatConsistentDuration(totalMinutes) },
                              ]}
                              actions={
                                <ActionPanel>
                                  <ActionPanel.Section
                                    title={
                                      filterProject !== "all" || projectKey === "unassigned"
                                        ? `${taskKey}${logs.length > 1 ? ` [x${logs.length}]` : ""}`
                                        : `${projectName} — ${taskKey}${logs.length > 1 ? ` [x${logs.length}]` : ""}`
                                    }
                                  >
                                    <Action
                                      title="Resume"
                                      icon={Icon.Play}
                                      onAction={() => {
                                        // Get the first log's description to use for the timer
                                        const firstLog = logs[0];
                                        startTimer(firstLog.description || "", firstLog.projectId);
                                      }}
                                    />
                                    {/* Only show Edit action if there's exactly one log in the group */}
                                    {logs.length === 1 && (
                                      <Action
                                        title="Edit Time Log"
                                        icon={Icon.Pencil}
                                        onAction={() => push(<EditTimeLogForm entry={logs[0]} onSave={loadData} />)}
                                      />
                                    )}
                                    <Action
                                      title="Delete Time Logs"
                                      icon={Icon.Trash}
                                      style={Action.Style.Destructive}
                                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                                      onAction={async () => {
                                        if (
                                          await confirmAlert({
                                            title: "Delete Time Logs",
                                            message: `Are you sure you want to delete ${logs.length} time logs?`,
                                            primaryAction: {
                                              title: "Delete",
                                              style: Alert.ActionStyle.Destructive,
                                            },
                                          })
                                        ) {
                                          showToast({
                                            style: Toast.Style.Animated,
                                            title: "Deleting time logs...",
                                          });

                                          try {
                                            // Delete logs one by one for better reliability
                                            for (const log of logs) {
                                              await deleteTimeEntry(log.id);
                                            }

                                            showToast({
                                              style: Toast.Style.Success,
                                              title: `${logs.length} Time Logs deleted`,
                                            });
                                            await loadData();
                                          } catch (error) {
                                            console.error("Error deleting time logs:", error);
                                            showToast({
                                              style: Toast.Style.Failure,
                                              title: "Failed to delete Time Logs",
                                            });
                                          }
                                        }
                                      }}
                                    />
                                  </ActionPanel.Section>

                                  <ActionPanel.Section>
                                    <Action
                                      title="Add Time Log"
                                      icon={Icon.Plus}
                                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                                      onAction={() => push(<AddTimeLogForm onSave={loadData} />)}
                                    />
                                    <Action
                                      title="Switch to Detailed View"
                                      icon={Icon.List}
                                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                                      onAction={toggleViewMode}
                                    />
                                  </ActionPanel.Section>
                                </ActionPanel>
                              }
                            />
                          );
                        });
                      })
                      .flat();
                  })
                  .flat()}
              </List.Section>
            );
          })}

          {/* Load More button in summary view */}
          {hasMoreLogs && (
            <List.Section title="Previous Months">
              <List.Item
                title="Load Previous Time Logs"
                icon={Icon.ChevronDownSmall}
                actions={
                  <ActionPanel>
                    <Action
                      title="Load Previous Time Logs"
                      icon={Icon.ChevronDownSmall}
                      onAction={handleLoadMoreMonths}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}

      {/* Empty State */}
      {Object.keys(viewMode === "detailed" ? groupedLogs : groupedByMonthAndProject || {}).length === 0 &&
        !activeTimer && (
          <List.EmptyView
            title="No Time Logs"
            description="Start tracking your time or add a time log manually"
            icon={Icon.Clock}
          />
        )}
    </List>
  );
}
