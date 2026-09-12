/* eslint-disable @typescript-eslint/no-explicit-any */
import Task from "./Task";
import axios from "axios";
import { API_URL, AuthContext } from "./lib";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useContext, useState, useEffect, useRef } from "react";

export default function CreateTask() {
  const { token } = useContext(AuthContext);
  const { push } = useNavigation();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [titleError, setTitleError] = useState<string>();

  const organizationRef = useRef<Form.Dropdown>(null);
  const descriptionRef = useRef<Form.TextArea>(null);
  const autoAssignRef = useRef<Form.Checkbox>(null);
  const dueDateRef = useRef<Form.DatePicker>(null);
  const priorityRef = useRef<Form.Dropdown>(null);
  const titleRef = useRef<Form.TextField>(null);

  useEffect(() => {
    try {
      axios
        .get(`${API_URL}/organizations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          setOrganizations(res.data);
          setIsLoading(false);
        });
    } catch {
      showToast(Toast.Style.Failure, "Failed to retrieve your workspaces");
      setIsLoading(false);
    }
  }, []);

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  async function handleSubmit({ organization, autoAssign, ...data }: any) {
    if (!data.title) {
      setTitleError("Please provide a task title");
      return;
    }

    setIsLoading(true);

    try {
      const task = await axios
        .post(
          `${API_URL}/organizations/${organization}/tasks?autoAssign=${autoAssign}`,
          {
            data: {
              isCompleted: false,
              ...data,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((res) => res.data);

      if (task) {
        setIsLoading(false);

        organizationRef.current?.reset();
        descriptionRef.current?.reset();
        autoAssignRef.current?.reset();
        priorityRef.current?.reset();
        dueDateRef.current?.reset();
        titleRef.current?.reset();

        showToast(Toast.Style.Success, "Task created👍");

        push(<Task task={task} organizationId={organization} />);
      }
    } catch {
      showToast(Toast.Style.Failure, "Failed to create task");
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="New task"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.ArrowRight} title="Create Task" />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="organization" title="Workspace" ref={organizationRef}>
        {organizations?.map((organization) => (
          <Form.Dropdown.Item value={organization.id} title={organization.name} key={organization.id} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        error={titleError}
        ref={titleRef}
        id="title"
        title="Title"
        placeholder="Implement feature"
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            dropTitleErrorIfNeeded();
          } else {
            setTitleError("Please provide a task title");
          }
        }}
      />

      <Form.TextArea
        placeholder="We should implement this feature by..."
        info="Markdown is supported"
        ref={descriptionRef}
        title="Description"
        id="description"
        enableMarkdown
      />

      <Form.DatePicker ref={dueDateRef} id="dueDate" title="Due date" />

      <Form.Dropdown ref={priorityRef} id="priority" title="Priority">
        <Form.Dropdown.Item title="None" value="" />

        {["Low", "Medium", "High"].map((priority) => (
          <Form.Dropdown.Item key={priority} value={priority} title={priority} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        ref={autoAssignRef}
        label="Assign myself as a member on this task"
        title="Assign to myself"
        id="autoAssign"
      />
    </Form>
  );
}
