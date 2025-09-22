import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation, Detail } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import type { Project, TimeEntry } from "@models";
import { readItem } from "@utils/storage-helper";

/**
 * Interface for the form values used in ProjectReportCommand.
 */
interface FormValues {
  projectId: string;
  periodType: "all" | "month" | "custom";
  customStartDate?: Date;
  customEndDate?: Date;
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Command component for generating a report for a specific project.
 * Allows users to select a project and a time period (all time, specific month, or custom range).
 * Fetches data from LocalStorage, filters entries, and displays a report in a Detail view.
 */
export default function ProjectReportCommand() {
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTimeEntries, setAllTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPeriodType, setSelectedPeriodType] = useState<"all" | "month" | "custom">("all");

  /**
   * Memoized array of available years for the year selection dropdown in 'Specific Month/Year' mode.
   * Includes all years from time entries plus the current year, sorted descending.
   */
  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    allTimeEntries.forEach((entry) => years.add(new Date(entry.date + "T00:00:00Z").getUTCFullYear()));
    if (years.size === 0 || !years.has(currentYear)) {
      years.add(currentYear);
    }
    return Array.from(years)
      .sort((a, b) => b - a)
      .map(String);
  }, [allTimeEntries]);

  const [selectedMonthForReport, setSelectedMonthForReport] = useState<string>(currentMonth.toString());
  const [selectedYearForReport, setSelectedYearForReport] = useState<string>(currentYear.toString());

  /**
   * Fetches projects and time entries from LocalStorage on component mount.
   * Updates loading state and shows a toast if no projects are found.
   */
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const loadedProjects = await readItem("projects");
        setProjects(loadedProjects);

        setAllTimeEntries(await readItem("timeEntries"));

        if (loadedProjects.length === 0) {
          await showToast({
            // Using a simple toast for general information
            title: "No Projects Available",
            message: "Please add a project first to generate reports.",
          });
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: "Could not retrieve data from local storage.",
        });
        console.error("Failed to load data:", error);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  /**
   * Handles the submission of the project report form.
   * Validates input, filters time entries based on selected project and period,
   * calculates total hours, generates a markdown report, and pushes it to a Detail view.
   * @param values The submitted form values.
   */
  async function handleSubmit(values: FormValues) {
    if (!values.projectId) {
      await showToast({ style: Toast.Style.Failure, title: "Project Required", message: "Please select a project." });
      return;
    }

    if (projects.length === 0 && values.projectId === "") {
      // Check if the placeholder "no projects" item was submitted
      await showToast(
        Toast.Style.Failure,
        "No Projects Selected",
        "Cannot generate report without a project. Please add and select a project.",
      );
      return;
    }

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (values.periodType === "month") {
      const year = parseInt(selectedYearForReport);
      const month = parseInt(selectedMonthForReport);
      startDate = new Date(Date.UTC(year, month, 1));
      endDate = new Date(Date.UTC(year, month + 1, 0));
    } else if (values.periodType === "custom") {
      if (!values.customStartDate || !values.customEndDate) {
        await showToast(
          Toast.Style.Failure,
          "Date Range Required",
          "Please select a start and end date for custom period.",
        );
        return;
      }
      if (values.customEndDate < values.customStartDate) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Date Range",
          message: "End date cannot be before start date.",
        });
        return;
      }
      startDate = new Date(
        Date.UTC(
          values.customStartDate.getFullYear(),
          values.customStartDate.getMonth(),
          values.customStartDate.getDate(),
        ),
      );
      endDate = new Date(
        Date.UTC(values.customEndDate.getFullYear(), values.customEndDate.getMonth(), values.customEndDate.getDate()),
      );
    }

    const project = projects.find((p) => p.id === values.projectId);
    if (!project) {
      // This case might happen if projects get deleted while form is open, or if placeholder item was selected.
      await showToast(
        Toast.Style.Failure,
        "Project Not Found",
        "The selected project could not be found or does not exist.",
      );
      return;
    }

    const filtered = allTimeEntries.filter((entry) => {
      if (entry.projectId !== values.projectId) return false;
      if (startDate && endDate) {
        const entryDate = new Date(entry.date + "T00:00:00Z");
        return entryDate >= startDate && entryDate <= endDate;
      }
      return true;
    });

    const totalHours = filtered.reduce((sum, entry) => sum + entry.hours, 0);

    let periodDescription = "All Time";
    if (values.periodType === "month") {
      periodDescription = `${MONTH_NAMES[parseInt(selectedMonthForReport)]} ${selectedYearForReport}`;
    } else if (values.periodType === "custom" && startDate && endDate) {
      periodDescription = `${startDate.toLocaleDateString("en-CA")} - ${endDate.toLocaleDateString("en-CA")}`;
    }

    const formattedEntries = filtered
      .map(
        (e) =>
          `- **${e.date}:** ${e.hours.toFixed(1)}h ${e.notes ? `(${e.notes.replace(/\r?\n|\r/g, " ").replace(/`/g, "\\`")})` : ""}`,
      )
      .join("\n");

    const markdown = `
# Project Report: ${project.name.replace(/`/g, "\\`")}

**Period:** ${periodDescription}

**Total Hours Logged:** ${totalHours.toFixed(2)} hours

---

### Logged Entries (${filtered.length})

${filtered.length > 0 ? formattedEntries : "No entries found for this period."}
    `;

    push(<Detail markdown={markdown} navigationTitle={`Report: ${project.name}`} />);
  }

  const selectedMonthYearValueForDropdown = `${selectedYearForReport}-${selectedMonthForReport}`;
  const canSubmitForm = projects.length > 0 && !isLoading;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {canSubmitForm && <Action.SubmitForm title="Generate Report" icon={Icon.BarChart} onSubmit={handleSubmit} />}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project" storeValue>
        {!canSubmitForm && !isLoading ? (
          <Form.Dropdown.Item value="" title="No projects available" />
        ) : (
          projects.map((project) => <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />)
        )}
      </Form.Dropdown>

      <Form.Dropdown
        id="periodType"
        title="Report Period"
        value={selectedPeriodType}
        onChange={(newValue) => setSelectedPeriodType(newValue as "all" | "month" | "custom")}
      >
        <Form.Dropdown.Item value="all" title="All Time" />
        <Form.Dropdown.Item value="month" title="Specific Month/Year" />
        <Form.Dropdown.Item value="custom" title="Custom Date Range" />
      </Form.Dropdown>

      {selectedPeriodType === "month" && (
        <Form.Dropdown
          id="selectedMonthYearForDisplay"
          title="Select Month & Year"
          value={selectedMonthYearValueForDropdown}
          onChange={(newValue) => {
            const [year, month] = newValue.split("-");
            setSelectedYearForReport(year);
            setSelectedMonthForReport(month);
          }}
        >
          {yearOptions.map((year) => (
            <Form.Dropdown.Section title={year} key={year}>
              {MONTH_NAMES.map((monthName, index) => (
                <Form.Dropdown.Item key={`${year}-${index}`} title={monthName} value={`${year}-${index}`} />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      )}

      {selectedPeriodType === "custom" && (
        <>
          <Form.DatePicker id="customStartDate" title="Start Date" defaultValue={new Date()} />
          <Form.DatePicker id="customEndDate" title="End Date" defaultValue={new Date()} />
        </>
      )}
      {!canSubmitForm && !isLoading && (
        <Form.Description text="⚠️ No projects found. Please add a project via 'Add New Project' before generating reports." />
      )}
    </Form>
  );
}
