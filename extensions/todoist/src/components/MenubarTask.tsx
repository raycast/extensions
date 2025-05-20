import {
  getPreferenceValues,
  Color,
  confirmAlert,
  Icon,
  MenuBarExtra,
  open,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import removeMarkdown from "remove-markdown";

import { SyncData, Task, deleteTask as apiDeleteTAsk, closeTask, updateTask } from "../api";
import { getCollaboratorIcon, getProjectCollaborators } from "../helpers/collaborators";
import { getRemainingLabels } from "../helpers/labels";
import { truncateMiddle } from "../helpers/menu-bar";
import { priorities, getPriorityIcon } from "../helpers/priorities";
import { getTaskAppUrl, getTaskUrl } from "../helpers/tasks";
import { useFocusedTask } from "../hooks/useFocusedTask";
import { useIsTodoistInstalled } from "../hooks/useIsTodoistInstalled";

type MenuBarTaskProps = {
  task: Task;
  data?: SyncData;
  setData: React.Dispatch<React.SetStateAction<SyncData | undefined>>;
};

const MenuBarTask = ({ task, data, setData }: MenuBarTaskProps) => {
  const { focusedTask, unfocusTask, focusTask } = useFocusedTask();
  const { taskWidth } = getPreferenceValues<Preferences.MenuBar>();
  const { useConfetti } = getPreferenceValues<Preferences>();

  const collaborators = getProjectCollaborators(task.project_id, data);
  const remainingLabels = task && data?.labels ? getRemainingLabels(task, data.labels) : [];
  const taskTitle = useMemo(() => {
    return truncateMiddle(removeMarkdown(task.content), parseInt(taskWidth ?? "40"));
  }, [task, taskWidth]);

  const subTasks = data?.items.filter((item) => item.parent_id === task.id);

  async function completeTask(task: Task) {
    try {
      await closeTask(task.id, { data, setData });

      if (focusedTask.id === task.id) {
        unfocusTask();
      }

      await showToast({ style: Toast.Style.Success, title: "Completed task" });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to complete task" });
    }
    if (useConfetti) {
      try {
        await open("raycast://extensions/raycast/raycast/confetti");
      } catch (error) {
        await showFailureToast(error, { title: "Unable to show celebration" });
      }
    }
  }

  async function changeDate(task: Task, timeString: string, type: "due" | "deadline") {
    try {
      const updateData = {
        id: task.id,
        [type]: { string: timeString },
      };

      await updateTask(updateData, { data, setData });
      await showToast({ style: Toast.Style.Success, title: `Updated task ${type}` });
    } catch (error) {
      await showFailureToast(error, { title: `Unable to update task ${type}` });
    }
  }

  async function changePriority(task: Task, priority: number) {
    try {
      await updateTask({ id: task.id, priority }, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Updated task priority" });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to update task priority" });
    }
  }

  async function changeAssignee(task: Task, collaboratorId: string) {
    try {
      await updateTask({ id: task.id, responsible_uid: collaboratorId }, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Updated task assignee" });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to update task assignee" });
    }
  }

  async function addLabel(task: Task, label: string) {
    try {
      await updateTask({ id: task.id, labels: [...task.labels, label] }, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Added task label" });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to add task label" });
    }
  }

  async function deleteTask(task: Task) {
    if (
      await confirmAlert({
        title: "Delete Task",
        message: "Are you sure you want to delete this task?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await apiDeleteTAsk(task.id, { data, setData });
        await showToast({ style: Toast.Style.Success, title: "Deleted task" });
      } catch (error) {
        await showFailureToast(error, { title: "Unable to delete task" });
      }
    }
  }

  const isTodoistInstalled = useIsTodoistInstalled();

  return (
    <MenuBarExtra.Submenu title={taskTitle} icon={getPriorityIcon(task)}>
      <MenuBarExtra.Item
        title="Open in Raycast"
        onAction={() =>
          launchCommand({ name: "home", type: LaunchType.UserInitiated, context: { view: `task_${task.id}` } })
        }
        icon={Icon.RaycastLogoNeg}
      />
      <MenuBarExtra.Item
        title="Open in Todoist"
        onAction={() => (isTodoistInstalled ? open(getTaskAppUrl(task.id)) : open(getTaskUrl(task.id)))}
        icon={isTodoistInstalled ? "todoist.png" : Icon.Globe}
      />
      {focusedTask.id !== task.id ? (
        <MenuBarExtra.Item title="Focus Task" onAction={() => focusTask(task)} icon={Icon.Center} />
      ) : (
        <MenuBarExtra.Item title="Unfocus Task" onAction={() => unfocusTask()} icon={Icon.MinusCircle} />
      )}
      {subTasks && subTasks?.length > 0 ? (
        <MenuBarExtra.Submenu
          title={`${subTasks.length} subtask` + (subTasks.length > 1 ? "s" : "")}
          icon={{ source: "sub-task.svg", tintColor: Color.SecondaryText }}
        >
          {subTasks.map((task) => (
            <MenuBarTask key={task.id} task={task} data={data} setData={setData} />
          ))}
        </MenuBarExtra.Submenu>
      ) : null}
      <MenuBarExtra.Item title="Complete Task" onAction={() => completeTask(task)} icon={Icon.Checkmark} />
      <MenuBarExtra.Submenu title="Change Date" icon={Icon.Clock}>
        <MenuBarExtra.Item title="Today" icon={Icon.Calendar} onAction={() => changeDate(task, "today", "due")} />
        <MenuBarExtra.Item title="Tomorrow" icon={Icon.Sunrise} onAction={() => changeDate(task, "tomorrow", "due")} />
        <MenuBarExtra.Item
          title="Next Week"
          icon={Icon.ArrowClockwise}
          onAction={() => changeDate(task, "next week", "due")}
        />
        <MenuBarExtra.Item title="Next Weekend" icon={"🌴"} onAction={() => changeDate(task, "next weekend", "due")} />
        <MenuBarExtra.Item
          title="No Date"
          icon={Icon.XMarkCircle}
          onAction={() => changeDate(task, "no date", "due")}
        />
      </MenuBarExtra.Submenu>
      {data?.user?.premium_status !== "not_premium" ? (
        <MenuBarExtra.Submenu title="Change Deadline" icon={Icon.BullsEye}>
          <MenuBarExtra.Item
            title="Today"
            icon={Icon.Calendar}
            onAction={() => changeDate(task, "today", "deadline")}
          />
          <MenuBarExtra.Item
            title="Tomorrow"
            icon={Icon.Sunrise}
            onAction={() => changeDate(task, "tomorrow", "deadline")}
          />
          <MenuBarExtra.Item
            title="Next Week"
            icon={Icon.ArrowClockwise}
            onAction={() => changeDate(task, "next week", "deadline")}
          />
          <MenuBarExtra.Item
            title="Next Weekend"
            icon={"🌴"}
            onAction={() => changeDate(task, "next weekend", "deadline")}
          />
          <MenuBarExtra.Item
            title="No Date"
            icon={Icon.XMarkCircle}
            onAction={() => changeDate(task, "no date", "deadline")}
          />
        </MenuBarExtra.Submenu>
      ) : null}
      <MenuBarExtra.Submenu title="Change Priority" icon={{ source: "priority.svg", tintColor: Color.SecondaryText }}>
        {priorities.map((priority, index) => (
          <MenuBarExtra.Item
            key={index}
            title={priority.name}
            icon={{ source: Icon.Circle, tintColor: priority.color }}
            onAction={() => changePriority(task, priority.value)}
          />
        ))}
      </MenuBarExtra.Submenu>
      {collaborators && collaborators.length > 0 ? (
        <MenuBarExtra.Submenu icon={Icon.AddPerson} title="Assign To">
          {collaborators.map((collaborator) => {
            return (
              <MenuBarExtra.Item
                key={collaborator.id}
                icon={getCollaboratorIcon(collaborator)}
                title={collaborator.full_name}
                onAction={() => changeAssignee(task, collaborator.id)}
              />
            );
          })}
        </MenuBarExtra.Submenu>
      ) : null}
      {remainingLabels && remainingLabels.length > 0 ? (
        <MenuBarExtra.Submenu title="Add Label" icon={Icon.Tag}>
          {remainingLabels.map((label) => (
            <MenuBarExtra.Item
              key={label.id}
              title={label.name}
              icon={{ source: Icon.Tag, tintColor: label.color }}
              onAction={() => addLabel(task, label.name)}
            />
          ))}
        </MenuBarExtra.Submenu>
      ) : null}
      <MenuBarExtra.Item title="Delete Task" onAction={() => deleteTask(task)} icon={Icon.Trash} />
    </MenuBarExtra.Submenu>
  );
};

export default MenuBarTask;
