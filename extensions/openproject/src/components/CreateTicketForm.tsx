import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { CreateTicketFormValues, Project, WorkPackageType, User, Priority } from "../types";
import OpenProjectAPI from "../api";

interface CreateTicketFormProps {
  initialValues?: Partial<CreateTicketFormValues>;
  onSuccess?: () => void;
}

export function CreateTicketForm({ initialValues, onSuccess }: CreateTicketFormProps) {
  const { pop } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [types, setTypes] = useState<WorkPackageType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = new OpenProjectAPI();

  useEffect(() => {
    async function loadFormData() {
      try {
        setIsLoading(true);
        setError(null);

        const connectionOk = await api.testConnection();
        if (!connectionOk) {
          throw new Error("Failed to connect to OpenProject. Please check your API URL and key.");
        }

        const [projectsData, typesData, usersData, prioritiesData] = await Promise.all([
          api.getProjects(),
          api.getWorkPackageTypes(),
          api.getUsers(),
          api.getPriorities(),
        ]);

        setProjects(projectsData);
        setTypes(typesData);
        setUsers(usersData);
        setPriorities(prioritiesData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Error loading form data",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadFormData();
  }, []);

  async function handleSubmit(values: CreateTicketFormValues) {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating ticket...",
      });

      const workPackage = await api.createWorkPackage({
        subject: values.subject,
        description: values.description,
        projectId: parseInt(values.project),
        typeId: parseInt(values.type),
        assigneeId: values.assignee ? parseInt(values.assignee) : undefined,
        priorityId: values.priority ? parseInt(values.priority) : undefined,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Ticket created successfully";
      toast.message = `#${workPackage.id}: ${workPackage.subject}`;

      onSuccess?.();
      pop();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error creating ticket",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (error) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Visit Openproject Website" url="https://www.openproject.org" />
          </ActionPanel>
        }
      >
        <Form.Description text={`Error: ${error}`} />
        <Form.Description text="Please check your OpenProject settings in Raycast preferences." />
        <Form.Separator />
        <Form.Description
          title="ℹ️ Disclaimer"
          text="This is an unofficial community extension. Not affiliated with OpenProject GmbH."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Ticket" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="subject"
        title="Subject"
        placeholder="Enter ticket subject"
        defaultValue={initialValues?.subject || ""}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter ticket description (optional)"
        defaultValue={initialValues?.description || ""}
      />

      <Form.Dropdown id="project" title="Project" placeholder="Select project" defaultValue={initialValues?.project}>
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} icon="📁" />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="type" title="Type" placeholder="Select type" defaultValue={initialValues?.type}>
        {types.map((type) => (
          <Form.Dropdown.Item
            key={type.id}
            value={type.id.toString()}
            title={type.name}
            icon={{ source: "⚫", tintColor: type.color }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="assignee"
        title="Assignee"
        placeholder="Select assignee (optional)"
        defaultValue={initialValues?.assignee || ""}
      >
        <Form.Dropdown.Item value="" title="Unassigned" icon="👤" />
        {users.map((user) => (
          <Form.Dropdown.Item key={user.id} value={user.id.toString()} title={user.name} icon="👤" />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="priority"
        title="Priority"
        placeholder="Select priority (optional)"
        defaultValue={initialValues?.priority || ""}
      >
        <Form.Dropdown.Item value="" title="Default Priority" icon="🔥" />
        {priorities.map((priority) => (
          <Form.Dropdown.Item key={priority.id} value={priority.id.toString()} title={priority.name} icon="🔥" />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
