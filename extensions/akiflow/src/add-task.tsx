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
import { Akiflow } from "../utils/akiflow";
import { toISO8601WithTimezoneOffset } from "../utils/time-utils";
import { useEffect, useState } from "react";
import { useForm } from "@raycast/utils";

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
type TaskFunction = (taskName?: string) => void;
const taskAddedFunctions: Record<string, TaskFunction> = {
  doNothing: () => {},
  popToRoot: () => {
    popToRoot();
  },
  closeRaycastWindow: () => closeMainWindow({ popToRootType: PopToRootType.Immediate }),
  // do not open Akiflow or the created task after add
  openAkiflow: () => {},
  viewTaskInAkiflow: () => {},
};

type FormValues = {
  title: string;
  description?: string;
  priority?: string; // dropdown values are strings
  tags_ids?: string[];
  listId?: string;
};

export default function Command() {
  const [projects, setProjects] = useState<{ [key: string]: Project }>({});
  const [tags, setTags] = useState<{ [key: string]: string }>({});
  const [planDate, setPlanDate] = useState<Date | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [description, setDescription] = useState<string>("");
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

  async function addTaskWithAuthorization(taskValues: FormValues): Promise<boolean> {
    const akiflow = new Akiflow(refreshToken);
    console.log(taskValues);
    const task: Task = {
      title: taskValues.title,
    };

    if (description) {
      task.description = description;
    }
    if (planDate) {
      task.status = 2;
      const date = new Date(planDate);
      if (Form.DatePicker.isFullDay(date)) {
        task.date = date.toISOString().split("T")[0];
      } else {
        task.datetime = toISO8601WithTimezoneOffset(date);
        task.date = date.toISOString().split("T")[0];
      }
    }
    if (task.status !== 2) {
      task.status = 1;
    }
    if (deadline) {
      task.due_date = new Date(deadline).toISOString().split("T")[0];
    }
    if (taskValues.priority && taskValues.priority !== "99") {
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
      taskAddedFunctions[taskAddedAction](task.title);
      showToast({ title: "Task added successfully", style: Toast.Style.Success });
      return true;
    } catch (error) {
      const errorMessage = (error as Error).message;
      showToast({ title: "Error adding task", message: errorMessage, style: Toast.Style.Failure });
      console.error("Error adding task:", error);
      return false;
    }
  }

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    onSubmit: async (values) => {
      const success = await addTaskWithAuthorization({ ...values, description });
      if (success) {
        reset();
        setPlanDate(null);
        setDeadline(null);
        setDescription("");
      }
    },
    initialValues: {
      title: "",
      priority: "99",
      tags_ids: [],
      listId: "",
    },
  });

  return (
    <Form
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Task Title" placeholder="Enter task title" {...itemProps.title} />
      <Form.TextArea
        id="description"
        title="Task Description"
        placeholder="Enter task description"
        storeValue={false}
        value={description}
        onChange={setDescription}
      />
      <Form.Separator />
      <Form.DatePicker id="date" title="Date (and time)" value={planDate} onChange={setPlanDate} />
      <Form.DatePicker
        id="due_date"
        type={Form.DatePicker.Type.Date}
        title="Deadline"
        value={deadline}
        onChange={setDeadline}
      />
      <Form.Separator />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
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
      {Object.entries(tags).length > 0 && (
        <Form.TagPicker title="Select Tags" {...itemProps.tags_ids}>
          {Object.entries(tags).map(([id, title]) => (
            <Form.TagPicker.Item key={id} value={id} title={title} icon={Icon.Tag} />
          ))}
        </Form.TagPicker>
      )}
      {Object.entries(projects).length > 0 && (
        <Form.Dropdown title="Select Project" {...itemProps.listId}>
          <Form.Dropdown.Item key="noproject" value="" title="No Project" />
          {Object.entries(projects)
            .sort(([, a], [, b]) => {
              // sort parents first then alphabetically
              if (a.parentId === null && b.parentId !== null) return -1;
              if (a.parentId !== null && b.parentId === null) return 1;
              return a.title.localeCompare(b.title);
            })
            .map(([id, { title, icon, parentId }]) => (
              <Form.Dropdown.Item
                key={id}
                value={id}
                title={parentId ? `  ${title}` : title}
                icon={icon ?? Icon.Folder}
              />
            ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
