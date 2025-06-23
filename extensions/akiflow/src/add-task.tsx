import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Icon,
  Toast,
  closeMainWindow,
  popToRoot,
  PopToRootType,
} from "@raycast/api";
import { Akiflow, openAkiflow, viewTaskInAkiflow } from "../utils/akiflow";
import { useEffect, useState } from "react";

interface Task {
  title: string;
  description?: string;
  id?: string;
  date?: string;
  datetime?: string;
  duration?: number;
  priority?: number;
  listId?: string;
  done?: boolean;
  status?: number;
  due_date?: string;
  tags_ids?: string[];
}

interface Project {
  title: string;
  color: string;
  icon: string;
  parentId: string | null;
}

const taskAddedAction = getPreferenceValues<Preferences.AddTask>().taskAddedAction;
type NullaryFunction = () => void;
type TaskFunction = NullaryFunction | ((taskName?: string) => void);
const taskAddedFunctions: Record<string, TaskFunction> = {
  doNothing: () => {},
  popToRoot: () => {
    popToRoot();
  },
  closeRaycastWindow: () => closeMainWindow({ popToRootType: PopToRootType.Immediate }),
  openAkiflow: () => {
    openAkiflow();
  },
  viewTaskInAkiflow: (taskName?: string) => {
    viewTaskInAkiflow(taskName!);
  },
};

export default function Command() {
  const [projects, setProjects] = useState<{ [key: string]: Project }>({});
  const [tags, setTags] = useState<{ [key: string]: string }>({});
  const refreshToken = getPreferenceValues<Preferences>().refreshToken;

  useEffect(() => {
    const akiflow = new Akiflow(refreshToken);

    const fetchProjectsAndTags = async () => {
      try {
        await akiflow.projectsPromise; // Wait for the projects to be fetched
        setProjects(akiflow.projects); // Set the projects state
        await akiflow.refreshTags(); // Fetch tags
        setTags(akiflow.tags); // Set the tags state
      } catch (error) {
        console.error("Error fetching projects or tags:", error);
        showToast({ title: "Error", message: "Failed to fetch projects or tags" });
      }
    };

    fetchProjectsAndTags();
  }, [refreshToken]);

  async function addTaskWithAuthorization(taskValues: Task) {
    const akiflow = new Akiflow(refreshToken);
    console.log(taskValues);
    const task: Task = {
      title: taskValues.title,
    };

    if (taskValues.description) {
      task.description = taskValues.description;
    }
    if (taskValues.date) {
      task.status = 2;
      const date = new Date(taskValues.date ? taskValues.date : "");
      if (Form.DatePicker.isFullDay(date)) {
        task.date = date.toISOString().split("T")[0];
      } else {
        task.datetime = date.toISOString();
        task.date = date.toISOString().split("T")[0];
      }
    }
    if (task.status !== 2) {
      task.status = 1;
    }
    if (taskValues.due_date) {
      task.due_date = new Date(taskValues.due_date).toISOString().split("T")[0];
    }
    if (taskValues.priority !== 99) {
      task.priority = Number(taskValues.priority);
    }
    if (taskValues.tags_ids) {
      task.tags_ids = taskValues.tags_ids; // Add selected tags to the task
    }
    if (taskValues.listId) {
      task.listId = taskValues.listId;
    }

    try {
      showToast({ title: "Adding task...", style: Toast.Style.Animated });
      await akiflow.addSingleTask(task);
      console.log("Task added successfully");
      taskAddedFunctions[taskAddedAction]();
      showToast({ title: "Task added successfully", style: Toast.Style.Success });
    } catch (error) {
      const errorMessage = (error as Error).message;
      showToast({ title: "Error adding task", message: errorMessage, style: Toast.Style.Failure });
      console.error("Error adding task:", error);
    }
  }

  function handleSubmit(taskValues: Task) {
    addTaskWithAuthorization(taskValues);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Task Title" placeholder="Enter task title" />
      <Form.TextArea id="description" title="Task Description" placeholder="Enter task description" />
      <Form.Separator />
      <Form.DatePicker id="date" title="Date (and time)" />
      <Form.DatePicker type={Form.DatePicker.Type.Date} id="due_date" title="Deadline" />
      <Form.Separator />
      <Form.Dropdown id="priority" title="Priority">
        <Form.Dropdown.Item value="99" title="None" icon={Icon.Flag} />
        <Form.Dropdown.Item
          value="-1"
          title="Goal"
          icon={{ source: Icon.Flag, tintColor: { light: "#D46397", dark: "#D46397" } }}
        />
        <Form.Dropdown.Item
          value="1"
          title="High"
          icon={{ source: Icon.Flag, tintColor: { light: "#EA3737", dark: "#EA3737" } }}
        />
        <Form.Dropdown.Item
          value="2"
          title="Medium"
          icon={{ source: Icon.Flag, tintColor: { light: "#FFA500", dark: "#FFA500" } }}
        />
        <Form.Dropdown.Item
          value="3"
          title="Low"
          icon={{ source: Icon.Flag, tintColor: { light: "#31BF75", dark: "#31BF75" } }}
        />
      </Form.Dropdown>
      {Object.entries(tags).length > 0 ? (
        <Form.TagPicker id="tags_ids" title="Select Tags">
          {Object.entries(tags).map(([name, id]) => (
            <Form.TagPicker.Item key={id} value={id} title={name} icon={Icon.Tag} />
          ))}
        </Form.TagPicker>
      ) : (
        ""
      )}
      {Object.entries(projects).length > 0 ? (
        <Form.Dropdown id="listId" title="Select Project">
          <Form.Dropdown.Item key="noproject" value="" title="No Project" />
          {Object.entries(projects).map(([id, { title, icon, parentId }]) =>
            parentId ? <Form.Dropdown.Item key={id} value={id} title={title} icon={icon} /> : "",
          )}
        </Form.Dropdown>
      ) : (
        ""
      )}
    </Form>
  );
}
