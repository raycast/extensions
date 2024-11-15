import { Action, ActionPanel, Form, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import { createTodo, getProjectPeople } from "../oauth/auth";
import { showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import { BasecampPerson } from "../utils/types";

interface CreateTodoFormValues {
  title: string;
  description: string;
  startDate: Date | null;
  dueDate: Date | null;
  assigneeIds: string[];
  notifyAssignees: boolean;
  completionSubscriberIds: string[];
}

export default function CreateTodoForm({
  accountId,
  projectId,
  todoListId,
  onSuccess,
  isLoading,
}: {
  accountId: string;
  projectId: number;
  todoListId: number;
  onSuccess: () => void;
  isLoading?: boolean;
}) {
  const [projectPeople, setProjectPeople] = useState<BasecampPerson[]>([]);
  const [isLoadingProjectPeople, setIsLoadingProjectPeople] = useState(false);
  const { removeValue: removeDefaultTodoListConfig } = useLocalStorage<string>("defaultTodoListConfig", "");
  const { pop } = useNavigation();

  useEffect(() => {
    const loadProjectPeople = async () => {
      setIsLoadingProjectPeople(true);
      try {
        const fetchedProjectPeople = await getProjectPeople(accountId, projectId);
        setProjectPeople(fetchedProjectPeople);
      } catch (error) {
        console.error("Error fetching project people:", error);
      } finally {
        setIsLoadingProjectPeople(false);
      }
    };

    if (projectId) {
      loadProjectPeople();
    }
  }, []);

  const handleClearDefaultTodoList = () => {
    removeDefaultTodoListConfig();
    pop();
  };

  const { handleSubmit, itemProps, values } = useForm<CreateTodoFormValues>({
    async onSubmit(values) {
      try {
        await createTodo(accountId, projectId, todoListId, {
          content: values.title,
          description: values.description ? `<div>${values.description}</div>` : undefined,
          due_on: values.dueDate?.toISOString().split("T")[0] ?? undefined,
          assignee_ids: values.assigneeIds.map((id) => parseInt(id, 10)),
          notify: values.notifyAssignees,
        });

        onSuccess();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Todo",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      }
    },
    initialValues: {
      dueDate: null,
      assigneeIds: [],
      completionSubscriberIds: [],
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Todo" onSubmit={handleSubmit} />
          <Action title="Clear Default Todo List" onAction={handleClearDefaultTodoList} />
        </ActionPanel>
      }
      isLoading={isLoading || isLoadingProjectPeople}
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Describe this to-do..." autoFocus />
      <Form.TagPicker title="Assigned to" {...itemProps.assigneeIds}>
        {projectPeople.map((person) => (
          <Form.TagPicker.Item
            key={person.id}
            value={person.id.toString()}
            title={person.name}
            icon={{ source: person.avatar_url }}
          />
        ))}
      </Form.TagPicker>
      {values.assigneeIds.length > 0 && (
        <Form.Checkbox label="Notify them about this assignment" {...itemProps.notifyAssignees} />
      )}
      <Form.TagPicker title="When Done, Notify" {...itemProps.completionSubscriberIds}>
        {projectPeople.map((person) => (
          <Form.TagPicker.Item
            key={person.id}
            value={person.id.toString()}
            title={person.name}
            icon={{ source: person.avatar_url }}
          />
        ))}
      </Form.TagPicker>
      <Form.DatePicker {...itemProps.dueDate} title="Due On" />
      <Form.TextArea {...itemProps.description} title="Notes" placeholder="Add extra details..." enableMarkdown />
    </Form>
  );
}
