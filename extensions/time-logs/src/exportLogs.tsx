import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Icon, Clipboard, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getTimeEntries, getProjects } from "./storage";
import { TimeEntry, Project } from "./models";
import { calculateDuration } from "./utils";

export default function ExportLogs() {
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeFrame, setTimeFrame] = useState<string>("this_month");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dailySummary, setDailySummary] = useState<boolean>(true);
  const { pop } = useNavigation();

  // Load projects and initialize dates on component mount
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);

        // Load projects
        const allProjects = await getProjects();
        setProjects(allProjects);

        // Set default dates based on current timeframe
        setDateRangeFromTimeFrame(timeFrame);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // Update date range when timeframe changes
  useEffect(() => {
    setDateRangeFromTimeFrame(timeFrame);
  }, [timeFrame]);

  // Helper to set date range based on selected timeframe
  function setDateRangeFromTimeFrame(selectedTimeFrame: string) {
    const now = new Date();

    if (selectedTimeFrame === "this_month") {
      // First day of current month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay);
      setEndDate(now);
    } else if (selectedTimeFrame === "last_month") {
      // First day of last month
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      // Last day of last month
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
    // For custom, keep the current date range
  }

  // Format date for display
  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Format duration in hours and minutes
  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  }

  // Helper function to get date string for grouping (YYYY-MM-DD)
  function getDateKey(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  }

  // Generate markdown for a single project
  function generateProjectMarkdown(
    projectName: string,
    entries: TimeEntry[],
    startDate: Date,
    endDate: Date,
    useDailySummary: boolean,
    selectedTimeFrame: string,
  ): string {
    // Build markdown content for this project
    let markdown = `# ${projectName} — Time Logs\n`;

    // Determine display dates based on time frame
    let displayStartDate = startDate;
    let displayEndDate = endDate;

    if (selectedTimeFrame === "this_month" || selectedTimeFrame === "last_month") {
      // For this_month or last_month, show the complete month range
      const year = displayStartDate.getFullYear();
      const month = displayStartDate.getMonth();

      // First day of the month
      displayStartDate = new Date(year, month, 1);

      // Last day of the month (setting day to 0 of next month gives last day of current month)
      displayEndDate = new Date(year, month + 1, 0);
    }

    markdown += `Dates: ${formatDate(displayStartDate)} – ${formatDate(displayEndDate)}\n`;

    // Calculate total duration for this project
    let totalMinutes = 0;

    entries.forEach((entry) => {
      if (entry.endTime) {
        const duration = calculateDuration(new Date(entry.startTime), new Date(entry.endTime));
        totalMinutes += duration;
      }
    });

    markdown += `Total Hours: ${formatDuration(totalMinutes)}\n\n`;

    if (useDailySummary) {
      // Group entries by day and task description
      const entriesByDayAndTask: Record<string, Record<string, number>> = {};

      entries.forEach((entry) => {
        if (!entry.endTime) return; // Skip entries without end time

        const entryDate = new Date(entry.startTime);
        const dateKey = getDateKey(entryDate);
        const description = entry.description || "No description";

        if (!entriesByDayAndTask[dateKey]) {
          entriesByDayAndTask[dateKey] = {};
        }

        if (!entriesByDayAndTask[dateKey][description]) {
          entriesByDayAndTask[dateKey][description] = 0;
        }

        const durationMinutes = calculateDuration(new Date(entry.startTime), new Date(entry.endTime));

        entriesByDayAndTask[dateKey][description] += durationMinutes;
      });

      // Sort days (oldest to newest)
      const sortedDays = Object.keys(entriesByDayAndTask).sort();

      // Add daily summary entries
      sortedDays.forEach((dateKey) => {
        const tasks = entriesByDayAndTask[dateKey];

        // Convert dateKey back to Date for formatting
        const [year, month, day] = dateKey.split("-").map((part) => parseInt(part));
        const date = new Date(year, month - 1, day);

        // Sort tasks by duration (highest first) within each day
        const sortedTasks = Object.entries(tasks).sort(([, durationA], [, durationB]) => durationB - durationA);

        sortedTasks.forEach(([description, duration]) => {
          markdown += `- [${formatDate(date)}] ${description} — ${formatDuration(duration)}\n`;
        });
      });
    } else {
      // Sort entries from oldest to newest
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      // Add detailed entries
      sortedEntries.forEach((entry) => {
        const entryDate = new Date(entry.startTime);
        let duration = "00:00";

        if (entry.endTime) {
          const durationMinutes = calculateDuration(new Date(entry.startTime), new Date(entry.endTime));
          duration = formatDuration(durationMinutes);
        }

        const description = entry.description || "No description";
        markdown += `- [${formatDate(entryDate)}] ${description} — ${duration}\n`;
      });
    }

    return markdown;
  }

  // Generate markdown export from filtered entries
  async function generateMarkdown(): Promise<string> {
    // Get all time entries
    const allEntries = await getTimeEntries();

    // Filter entries by date range
    const filteredEntries = allEntries.filter((entry) => {
      if (entry.isActive) return false; // Skip active timers

      const entryDate = new Date(entry.startTime);
      const compareDate = new Date(entryDate.setHours(0, 0, 0, 0));
      const isInDateRange =
        compareDate >= new Date(startDate.setHours(0, 0, 0, 0)) &&
        compareDate <= new Date(endDate.setHours(23, 59, 59, 999));

      return isInDateRange;
    });

    if (filteredEntries.length === 0) {
      throw new Error("No entries found for the selected criteria");
    }

    let markdown = "";

    // If "All Projects" is selected, generate separate sections for each project
    if (selectedProject === "all") {
      // Group entries by project
      const entriesByProject: Record<string, TimeEntry[]> = {};
      const projectMap: Record<string, Project> = {};

      // Create project lookup map
      projects.forEach((project) => {
        projectMap[project.id] = project;
        entriesByProject[project.id] = [];
      });

      // Also track unassigned entries
      entriesByProject["unassigned"] = [];

      // Group entries by project
      filteredEntries.forEach((entry) => {
        if (!entry.projectId) {
          entriesByProject["unassigned"].push(entry);
        } else if (entriesByProject[entry.projectId]) {
          entriesByProject[entry.projectId].push(entry);
        }
      });

      // Generate markdown for each project that has entries
      const projectSections: string[] = [];

      // Process projects first (in alphabetical order)
      const projectEntries = Object.entries(entriesByProject)
        .filter(([id]) => id !== "unassigned" && entriesByProject[id].length > 0)
        .sort(([idA], [idB]) => {
          const nameA = projectMap[idA]?.name || "";
          const nameB = projectMap[idB]?.name || "";
          return nameA.localeCompare(nameB);
        });

      // Add each project section
      projectEntries.forEach(([projectId, entries]) => {
        if (entries.length === 0) return;

        const projectName = projectMap[projectId]?.name || "Unknown Project";
        const projectSection = generateProjectMarkdown(
          projectName,
          entries,
          startDate,
          endDate,
          dailySummary,
          timeFrame,
        );

        projectSections.push(projectSection);
      });

      // Add unassigned entries last (if any)
      const unassignedEntries = entriesByProject["unassigned"];
      if (unassignedEntries.length > 0) {
        const unassignedSection = generateProjectMarkdown(
          "Unassigned",
          unassignedEntries,
          startDate,
          endDate,
          dailySummary,
          timeFrame,
        );

        projectSections.push(unassignedSection);
      }

      // Join all sections with horizontal dividers
      markdown = projectSections.join("\n---\n\n");
    } else {
      // Filter entries for the selected project
      const projectEntries = filteredEntries.filter((entry) => entry.projectId === selectedProject);

      if (projectEntries.length === 0) {
        throw new Error("No entries found for the selected project in this time range");
      }

      // Find project name
      const project = projects.find((p) => p.id === selectedProject);
      const projectName = project ? project.name : "Unknown Project";

      // Generate markdown for the single selected project
      markdown = generateProjectMarkdown(projectName, projectEntries, startDate, endDate, dailySummary, timeFrame);
    }

    return markdown;
  }

  // Export function
  async function handleExport() {
    try {
      setIsLoading(true);

      const markdown = await generateMarkdown();

      // Copy to clipboard
      await Clipboard.copy(markdown);

      showToast({
        style: Toast.Style.Success,
        title: "Exported successfully",
        message: "Time logs copied to clipboard as Markdown",
      });

      pop();
    } catch (error) {
      showFailureToast(error, { title: "Export failed" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Export to Clipboard" icon={Icon.Download} onAction={handleExport} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project" title="Project" value={selectedProject} onChange={setSelectedProject}>
        <Form.Dropdown.Item value="all" title="All Projects" icon={Icon.Tag} />
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.name}
            icon={{ source: Icon.Dot, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="timeFrame" title="Time Frame" value={timeFrame} onChange={setTimeFrame}>
        <Form.Dropdown.Item value="this_month" title="This Month" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="last_month" title="Last Month" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="custom" title="Custom" icon={Icon.Calendar} />
      </Form.Dropdown>

      {timeFrame === "custom" && (
        <>
          <Form.DatePicker
            id="startDate"
            title="Start Date"
            type={Form.DatePicker.Type.Date}
            value={startDate}
            onChange={(newValue) => newValue && setStartDate(newValue)}
          />

          <Form.DatePicker
            id="endDate"
            title="End Date"
            type={Form.DatePicker.Type.Date}
            value={endDate}
            onChange={(newValue) => newValue && setEndDate(newValue)}
          />
        </>
      )}

      <Form.Checkbox
        id="dailySummary"
        title="Format"
        label="Export Daily Summary"
        value={dailySummary}
        onChange={setDailySummary}
        info="Daily Summary combines same tasks within a day to simplify reports."
      />
    </Form>
  );
}
