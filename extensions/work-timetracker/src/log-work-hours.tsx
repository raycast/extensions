import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { randomUUID } from "crypto";
import { useForm, FormValidation } from "@raycast/utils";
import { logTimeToMonday } from "@monday/api";
import { seedProjectsFromMonday } from "@monday/project-sync";
import type { Project, TimeEntry } from "@models";
import { readItem, writeItem } from "@utils/storage-helper";

/**
 * Interface for the form values used in LogWorkHoursCommand.
 */
interface FormValues {
  date: Date | null;
  hours: string;
  projectId: string;
  notes: string;
}

/**
 * Command component for logging work hours.
 * Displays a form to input date, hours worked, select a project, and add optional notes.
 * Fetches projects from LocalStorage to populate the project dropdown.
 * Validates input and saves the time entry to LocalStorage.
 */
export default function LogWorkHoursCommand() {
  const { pop } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);

  /**
   * Fetches projects from LocalStorage when the component mounts.
   * Updates the projects state and loading state.
   */
  useEffect(() => {
    async function fetchProjects() {
      setIsLoadingProjects(true);
      try {
        const mergedProjects = await seedProjectsFromMonday();
        setProjects(mergedProjects);
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to load projects" });
        console.error("Failed to load projects:", error);
        setProjects([]);
      }
      setIsLoadingProjects(false);
    }
    fetchProjects();
  }, []);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { date: new Date(), hours: "", projectId: "", notes: "" },
    validation: {
      hours: (val) => {
        if (!val) {
          return "Required";
        }
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
          return "Must be a positive number";
        }
      },
      projectId: FormValidation.Required,
    },
    async onSubmit(values) {
      if (projects.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No Projects", message: "Add a project first." });
        return;
      }

      const hoursWorked = parseFloat(values.hours);

      try {
        const newEntry: TimeEntry = {
          id: randomUUID(),
          date: (values.date as Date).toISOString().split("T")[0],
          hours: hoursWorked,
          projectId: values.projectId,
          notes: values.notes?.trim() || undefined,
        };

        const timeEntries = await readItem("timeEntries");
        timeEntries.push(newEntry);
        await writeItem("timeEntries", timeEntries);

        const selectedProject = projects.find((p) => p.id === values.projectId);
        const projectName = selectedProject?.name || "Selected Project";
        await showToast({
          style: Toast.Style.Success,
          title: "Time Logged",
          message: `Logged ${hoursWorked} hours for ${projectName}.`,
        });

        await logTimeToMonday(newEntry, projectName, selectedProject?.mondayGroupId);

        pop();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to log time", message: "Could not save entry." });
        console.error("Failed to log time:", error);
      }
    },
  });

  const canSubmit = projects.length > 0 && !isLoadingProjects;

  return (
    <Form
      isLoading={isLoadingProjects}
      actions={
        <ActionPanel>
          {canSubmit && <Action.SubmitForm title="Log Hours" onSubmit={handleSubmit} icon={Icon.Clock} />}
        </ActionPanel>
      }
    >
      <Form.Description text="Log your work hours for a specific day and project." />
      {!isLoadingProjects && projects.length === 0 && (
        <>
          <Form.Separator />
          <Form.Description text="⚠️ No projects found. Please use the 'Add New Project' command to create a project before logging time." />
          <Form.Separator />
        </>
      )}
      <Form.DatePicker
        title="Date"
        {...(itemProps.date as unknown as Omit<Parameters<typeof Form.DatePicker>[0], "title">)}
      />
      <Form.TextField title="Hours Worked" placeholder="e.g., 7.5" {...itemProps.hours} />
      {}
      <Form.Dropdown
        title="Project"
        storeValue={projects.length > 0}
        disabled={projects.length === 0}
        {...itemProps.projectId}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={`${project.name} ${project.mondayGroupId ? "(Organization)" : "(Private)"}`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Notes (Optional)" placeholder="Details about the work done" {...itemProps.notes} />
    </Form>
  );
}
