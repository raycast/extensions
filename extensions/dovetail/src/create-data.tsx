import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import useApiToken from "./hooks/useApiToken";

type Values = {
  dataTitle: string;
  dataBody: string;
  projectId: string;
};

interface Author {
  id: string;
  name: string;
}

interface Project {
  id: string;
  author: Author;
  title: string;
  type: "project";
  created_at: string;
}

export default function CreateData() {
  const { apiToken } = useApiToken();

  // State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formValues, setFormValues] = useState<Values>({
    dataTitle: "Untitled",
    dataBody: "",
    projectId: "",
  });

  useEffect(() => {
    if (!apiToken) {
      return;
    }
    // Fetch the projects via the Dovetail API
    fetchProjects();
  }, [apiToken]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("https://dovetail.com/api/v1/projects", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const { data } = await response.json();

      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid response format: expected array of projects");
      }

      setProjects(data || []);

      if (data.length > 0 && !formValues.projectId) {
        // Set the first project as default if none is selected
        setFormValues((prev) => ({ ...prev, projectId: data[0].id }));
      }

      showToast(Toast.Style.Success, "Loaded projects", `Found ${data.length || 0} projects`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error fetching projects:", errorMessage);
      setError(errorMessage);
      showToast(Toast.Style.Failure, "Failed to load projects", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a note via the Dovetail API
  const createData = async ({ projectId, title, content }: { projectId: string; title: string; content: string }) => {
    try {
      if (!projectId) {
        throw new Error("No project selected");
      }

      showToast(Toast.Style.Animated, "Creating data...");

      const response = await fetch("https://dovetail.com/api/v1/notes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          title,
          content,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Error ${response.status}`;
        } catch {
          errorMessage = `HTTP error ${response.status}: ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      showToast(Toast.Style.Success, "Data created", "Successfully created data");

      return data.note;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error creating note:", errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Reset form to initial state
  // This doesn't work
  const resetForm = () => {
    setFormValues({
      dataTitle: "Untitled",
      dataBody: "",
      projectId: projects.length > 0 ? projects[0].id : "",
    });
  };

  async function handleSubmit(values: Values) {
    try {
      setIsSubmitting(true);
      setError("");

      const projectId = values.projectId;
      const title = values.dataTitle.trim();
      const content = values.dataBody;

      if (!projectId) {
        throw new Error("Please select a project");
      }

      if (!title) {
        throw new Error("Title cannot be empty");
      }

      await createData({ projectId, title, content });

      // Store values temporarily for potential error recovery
      setFormValues(values);

      showToast(Toast.Style.Success, "Submitted form", `Successfully created ${formValues.dataTitle} in Dovetail`);

      // Reset form after successful submission
      resetForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      showToast(Toast.Style.Failure, "Failed to create data", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={handleSubmit}
            title="Create Data"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Refresh Projects"
            icon={Icon.ArrowClockwise}
            onAction={fetchProjects}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Reset Form"
            icon={Icon.Trash}
            onAction={resetForm}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={error ? `Error: ${error}` : "Created data in your Dovetail project."} />

      {projects.length === 0 && !isLoading ? (
        <Form.Description text="No projects found. Please check your API token and try refreshing." />
      ) : (
        <>
          <Form.Dropdown id="projectId" title="Project" defaultValue={formValues.projectId}>
            {projects.map((project) => (
              <Form.Dropdown.Item value={project.id} title={project.title} key={project.id} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="dataTitle"
            title="Title"
            placeholder="Enter title"
            defaultValue={formValues.dataTitle}
            error={!formValues.dataTitle.trim() ? "Title is required" : undefined}
          />
          <Form.TextArea id="dataBody" title="Body" placeholder="Enter body" defaultValue={formValues.dataBody} />
        </>
      )}
      <Form.Separator />

      {isSubmitting && <Form.Description text="Creating data..." />}
    </Form>
  );
}

// Add missing Icon enum for buttons
enum Icon {
  Plus = "plus",
  ArrowClockwise = "arrow-clockwise",
  Trash = "trash",
}
