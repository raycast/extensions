import { Action, ActionPanel, Form, Toast, showHUD, PopToRootType, showToast, Icon } from "@raycast/api";
import { useCachedPromise, showFailureToast, useCachedState } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { BasecampPerson, BasecampProject, TodoList } from "../utils/types";
import { fetchAccounts, fetchProjects, fetchTodoLists, getProjectPeople, createTodo } from "../oauth/auth";

interface FormValues {
  accountId: string;
  projectId: string;
  todoListId: string;
  title: string;
  description: string;
  dueDate: Date | null;
  assigneeIds: string[];
  notifyAssignees: boolean;
  completionSubscriberIds: string[];
}

interface FormErrors {
  accountId?: string;
  projectId?: string;
  todoListId?: string;
  title?: string;
}

export default function CreateTodoSelectListForm() {
  // State for refreshing data
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use cached state for persistent values
  const [savedAccountId, setSavedAccountId] = useCachedState<string>("basecamp-account-id-create-todo", "");
  const [savedProjectId, setSavedProjectId] = useCachedState<string>("basecamp-project-id-create-todo", "");

  // State for form values
  const [formValues, setFormValues] = useState<FormValues>({
    accountId: savedAccountId || "",
    projectId: savedProjectId || "",
    todoListId: "",
    title: "",
    description: "",
    dueDate: null,
    assigneeIds: [],
    notifyAssignees: true,
    completionSubscriberIds: [],
  });

  // State for form errors
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // State for project people
  const [projectPeople, setProjectPeople] = useState<BasecampPerson[]>([]);

  // Use cached promise for accounts
  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    revalidate: revalidateAccounts,
  } = useCachedPromise(fetchAccounts);

  // Use cached promise for projects
  const {
    data: projectsResponse,
    isLoading: isLoadingProjects,
    revalidate: revalidateProjects,
  } = useCachedPromise(
    async (accountId: string) => {
      if (!accountId) return { data: [] };
      return fetchProjects(accountId, 1);
    },
    [formValues.accountId || ""],
    {
      execute: !!formValues.accountId,
    },
  );

  // Extract projects array from the response
  const projects: BasecampProject[] = projectsResponse?.data || [];

  // State for todosets
  const [todosets, setTodosets] = useState<{ id: number; title: string }[]>([]);

  // Use cached promise for todo lists
  const {
    data: todoListsResponse,
    isLoading: isLoadingTodoLists,
    revalidate: revalidateTodoLists,
  } = useCachedPromise(
    async (accountId: string, projectId: string, todosetId: number) => {
      if (!accountId || !projectId || !todosetId) return { data: [] };
      return fetchTodoLists(accountId, parseInt(projectId), todosetId, 1);
    },
    [formValues.accountId || "", formValues.projectId || "", todosets[0]?.id || 0],
    {
      execute: !!formValues.accountId && !!formValues.projectId && !!todosets[0]?.id,
    },
  );

  // Extract todo lists array from the response
  const todoLists: TodoList[] = todoListsResponse?.data || [];

  // Set saved account when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0 && savedAccountId) {
      const accountExists = accounts.some((account) => account.id.toString() === savedAccountId);
      if (accountExists) {
        setFormValues((prev) => ({ ...prev, accountId: savedAccountId }));
      }
    } else if (accounts.length === 1) {
      const accountId = accounts[0].id.toString();
      setFormValues((prev) => ({ ...prev, accountId }));
      setSavedAccountId(accountId);
    }
  }, [accounts, savedAccountId]);

  // Set saved project when projects are loaded
  useEffect(() => {
    if (projects.length > 0 && savedProjectId) {
      const projectExists = projects.some((project) => project.id.toString() === savedProjectId);
      if (projectExists) {
        setFormValues((prev) => ({ ...prev, projectId: savedProjectId }));
      } else {
        // If saved project doesn't exist in the list, clear it
        setSavedProjectId("");
      }
    } else if (projects.length === 1) {
      const projectId = projects[0].id.toString();
      setFormValues((prev) => ({ ...prev, projectId }));
      setSavedProjectId(projectId);
    }
  }, [projects, savedProjectId]);

  // Extract todosets from selected project
  useEffect(() => {
    if (formValues.projectId) {
      const selectedProject = projects.find((project) => project.id.toString() === formValues.projectId);
      if (selectedProject) {
        const projectTodosets = selectedProject.dock
          .filter((item) => item.enabled && item.name === "todoset")
          .map((item) => ({ id: item.id, title: item.title }));

        setTodosets(projectTodosets);

        // Reset todo list selection when project changes
        setFormValues((prev) => ({ ...prev, todoListId: "" }));
      }
    } else {
      setTodosets([]);
    }
  }, [formValues.projectId, projects]);

  // Load project people when project is selected
  useEffect(() => {
    const loadProjectPeople = async () => {
      if (formValues.accountId && formValues.projectId) {
        try {
          const fetchedProjectPeople = await getProjectPeople(formValues.accountId, parseInt(formValues.projectId));
          setProjectPeople(fetchedProjectPeople);
        } catch (error) {
          console.error("Error fetching project people:", error);
        }
      }
    };

    loadProjectPeople();
  }, [formValues.accountId, formValues.projectId]);

  // Validate form
  const validateForm = useMemo(() => {
    const errors: FormErrors = {};

    if (!formValues.accountId) {
      errors.accountId = "Account is required";
    }
    if (!formValues.projectId) {
      errors.projectId = "Project is required";
    }
    if (!formValues.todoListId) {
      errors.todoListId = "Todo list is required";
    }
    if (!formValues.title.trim()) {
      errors.title = "Title is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formValues]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Required Fields",
        message: "Please fill in all required fields",
      });
      return;
    }

    try {
      await createTodo(formValues.accountId, parseInt(formValues.projectId), parseInt(formValues.todoListId), {
        content: formValues.title,
        description: formValues.description ? `<div>${formValues.description}</div>` : undefined,
        due_on: formValues.dueDate?.toISOString().split("T")[0] ?? undefined,
        assignee_ids: formValues.assigneeIds.map((id) => parseInt(id, 10)),
        notify: formValues.notifyAssignees,
      });

      showHUD("Todo created ✅", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to create todo",
      });
    }
  };

  // Handle refreshing data
  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Force refresh all data
      await Promise.all([
        revalidateAccounts(),
        formValues.accountId ? revalidateProjects() : Promise.resolve(),
        formValues.accountId && formValues.projectId && todosets[0]?.id ? revalidateTodoLists() : Promise.resolve(),
      ]);

      showToast({
        style: Toast.Style.Success,
        title: "Data refreshed successfully",
      });
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to refresh data",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Form
      isLoading={isLoadingAccounts || isLoadingProjects || isLoadingTodoLists || isRefreshing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Todo" onSubmit={handleSubmit} />
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={handleRefresh}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="accountId"
        title="Account"
        placeholder="Select an account"
        value={formValues.accountId}
        onChange={(value) => {
          setFormValues((prev) => ({ ...prev, accountId: value, projectId: "", todoListId: "" }));
          setSavedAccountId(value);
        }}
        error={formErrors.accountId}
      >
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account.id} value={account.id.toString()} title={account.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="projectId"
        title="Project"
        placeholder="Select a project"
        value={formValues.projectId}
        onChange={(value) => {
          setFormValues((prev) => ({ ...prev, projectId: value, todoListId: "" }));
          setSavedProjectId(value);
        }}
        error={formErrors.projectId}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="todoListId"
        title="Todo List"
        placeholder="Select a todo list"
        value={formValues.todoListId}
        onChange={(value) => setFormValues((prev) => ({ ...prev, todoListId: value }))}
        error={formErrors.todoListId}
      >
        {todoLists.map((todoList) => (
          <Form.Dropdown.Item key={todoList.id} value={todoList.id.toString()} title={todoList.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Describe this to-do..."
        value={formValues.title}
        onChange={(value) => setFormValues((prev) => ({ ...prev, title: value }))}
        error={formErrors.title}
        autoFocus
      />

      <Form.TagPicker
        id="assigneeIds"
        title="Assigned to"
        value={formValues.assigneeIds}
        onChange={(value) => setFormValues((prev) => ({ ...prev, assigneeIds: value }))}
      >
        {projectPeople.map((person) => (
          <Form.TagPicker.Item
            key={person.id}
            value={person.id.toString()}
            title={person.name}
            icon={{ source: person.avatar_url }}
          />
        ))}
      </Form.TagPicker>

      {formValues.assigneeIds.length > 0 && (
        <Form.Checkbox
          id="notifyAssignees"
          label="Notify them about this assignment"
          value={formValues.notifyAssignees}
          onChange={(value) => setFormValues((prev) => ({ ...prev, notifyAssignees: value }))}
        />
      )}

      <Form.TagPicker
        id="completionSubscriberIds"
        title="When Done, Notify"
        value={formValues.completionSubscriberIds}
        onChange={(value) => setFormValues((prev) => ({ ...prev, completionSubscriberIds: value }))}
      >
        {projectPeople.map((person) => (
          <Form.TagPicker.Item
            key={person.id}
            value={person.id.toString()}
            title={person.name}
            icon={{ source: person.avatar_url }}
          />
        ))}
      </Form.TagPicker>

      <Form.DatePicker
        id="dueDate"
        title="Due On"
        value={formValues.dueDate}
        onChange={(value) => setFormValues((prev) => ({ ...prev, dueDate: value }))}
      />

      <Form.TextArea
        id="description"
        title="Notes"
        placeholder="Add extra details..."
        value={formValues.description}
        onChange={(value) => setFormValues((prev) => ({ ...prev, description: value }))}
        enableMarkdown
      />
    </Form>
  );
}
