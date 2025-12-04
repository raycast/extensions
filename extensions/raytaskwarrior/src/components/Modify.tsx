import { useState } from "react";
import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { Priority, Task } from "../types/types";
import { updateTask } from "../api";
import { formatDueDate } from "../utils/dateFormatters";

interface FormValues {
  description?: string;
  project?: string;
  tags?: string;
  due?: string;
}

const Modify = (props: { task: Task }) => {
  const { task } = props;

  const formatPriority = (priority?: Priority) => {
    switch (priority) {
      case Priority.H:
        return "High";
      case Priority.M:
        return "Medium";
      case Priority.L:
        return "Low";
      default:
        return "None";
    }
  };

  const parsePriority = (priority: string): Priority | "" | undefined => {
    switch (priority) {
      case "High":
        return Priority.H;
      case "Medium":
        return Priority.M;
      case "Low":
        return Priority.L;
      case "None":
        return "";
      default:
        return undefined;
    }
  };

  const [descriptionError, setdescriptionError] = useState<string | undefined>();
  const [tagsError, setTagsError] = useState<string | undefined>();
  const [dueDateError, setDueDateError] = useState<string | undefined>();
  const initialDueDate = task.due ? formatDueDate(task.due) : undefined;

  const [selectedPriority, setSelectedPriority] = useState<string>(formatPriority(task.priority));

  const dropDescriptionErrorIfNeeded = () => {
    if (descriptionError && descriptionError.length > 0) {
      setdescriptionError(undefined);
    }
  };

  const dropTagsErrorIfNeeded = () => {
    if (tagsError && tagsError.length > 0) {
      setTagsError(undefined);
    }
  };

  const dropDueDateErrorIfNeeded = () => {
    if (dueDateError && dueDateError.length > 0) {
      setDueDateError(undefined);
    }
  };

  const formatTags = (tags: Set<string>) => {
    return Array.from(tags)
      .map((tag) => {
        if (tag.startsWith("+") || tag.startsWith("-")) {
          return tag;
        }
        return `+${tag}`;
      })
      .join(",");
  };

  const isFormValid = (description?: string, tags?: string) => {
    let isValid = true;

    if (!description || description.trim().length === 0) {
      setdescriptionError("A task must at least have a description.");
      isValid = false;
    }

    if (tags && tags.includes(" ")) {
      setTagsError("spaces are not allowed. format: tag1,tag2,tag3");
      isValid = false;
    }

    if (tags) {
      const tagsArray = tags.split(",");
      const invalidTags = tagsArray.filter((tag) => !tag.startsWith("+") && !tag.startsWith("-"));
      if (invalidTags.length > 0) {
        setTagsError("Tags should start with + or -. Format: +tag1,-tag2,+tag3");
        isValid = false;
      }
    }

    return isValid;
  };

  const onSubmit = async ({ description, project, tags, due }: FormValues) => {
    if (!isFormValid(description, tags)) {
      return;
    }

    const tagsArray = tags?.split(",");
    const updatedDueDate = due === initialDueDate ? undefined : due;
    const parsedPriority = parsePriority(selectedPriority);
    try {
      await updateTask(task.uuid, description, project, tagsArray, updatedDueDate, parsedPriority);
      showToast({
        title: "Modified Task successfully",
        style: Toast.Style.Success,
      });
      popToRoot();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not a valid date")) {
        setDueDateError("Invalid due date format. Use the 'Y-M-D' format or Taskwarrior shorthand.");
      } else {
        console.error(error);
        showToast({
          title: `Error modifying task: ${error}`,
          style: Toast.Style.Failure,
        });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        key="description"
        title="Description"
        placeholder="task description"
        defaultValue={task.description}
        error={descriptionError}
        onChange={dropDescriptionErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setdescriptionError("A task must at least have a description.");
          } else {
            dropDescriptionErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="project"
        key="project"
        title="Project"
        placeholder="project name"
        defaultValue={task.project ? task.project : ""}
        info="leave empty to delete or not add a new project"
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="-tag1,+tag2,+tag3"
        defaultValue={task.tags ? formatTags(task.tags) : ""}
        info="add comma saparated list of tags. +tag to add and -tag to remove"
        error={tagsError}
        onChange={dropTagsErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.includes(" ")) {
            setTagsError("spaces are not allowed. format: tag1,tag2,tag3");
          } else {
            dropTagsErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="due"
        title="Due Date"
        placeholder="Y-M-D or Taskwarrior shorthand"
        defaultValue={initialDueDate}
        info="Enter due date in Y-M-D format or Taskwarrior shorthand (e.g., 'today', 'tomorrow', '+3d', '+1w')"
        error={dueDateError}
        onChange={dropDueDateErrorIfNeeded}
      />
      <Form.Dropdown id="priority" title="Priority" value={selectedPriority} onChange={setSelectedPriority}>
        <Form.Dropdown.Item value="High" title="High" />
        <Form.Dropdown.Item value="Medium" title="Medium" />
        <Form.Dropdown.Item value="Low" title="Low" />
        <Form.Dropdown.Item value="None" title="None" />
      </Form.Dropdown>
    </Form>
  );
};

export default Modify;
