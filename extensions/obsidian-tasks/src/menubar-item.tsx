import {
  Icon,
  MenuBarExtra,
  open,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import { getFormattedDescription } from "./utils";
import { PRIORITY_VALUES, Task } from "./types";
import { useTasks } from "./hooks/useTasks";
import { priorityToIcon } from "./utils/priority";

const Command = () => {
  const preferences = getPreferenceValues<Preferences>();
  const maxLength = parseInt(preferences.maxMenubarDescriptionLength) || 30;

  const {
    allTasks,
    topTask,
    isLoading,
    handleMarkDone,
    handleDeleteTask,
    handleSetPriority,
    refreshTaskList,
  } = useTasks(preferences);

  const getMenubarTitle = (task: Task): string => {
    if (!task) return "No Tasks";

    if (preferences.menubarTaskCount) {
      return `${allTasks.length.toString()}`;
    }

    const parts: string[] = [getFormattedDescription(task)];

    if (preferences.showDueDate && task.dueDate) {
      parts.push(`${task.dueDate.toLocaleDateString()}`);
    }

    return parts.join(" • ");
  };

  const handleOpenInObsidian = async () => {
    if (!topTask || !topTask.filePath) return;

    const fileName = preferences.filePath.split("/").pop() || "";
    const obsidianURI = `obsidian://open?file=${encodeURIComponent(fileName)}`;
    await open(obsidianURI);
  };

  const handleLaunchCommand = async (command: string) => {
    await launchCommand({ name: command, type: LaunchType.UserInitiated });
  };

  const handleEditTask = async (task: Task) => {
    await launchCommand({
      name: "edit-task",
      type: LaunchType.UserInitiated,
      arguments: { taskId: task.id },
    });
  };

  const handleDone = async (task: Task) => {
    await handleMarkDone(task);
    await refreshTaskList();
  };

  const BottomSection = (
    <>
      <MenuBarExtra.Item
        title="Create Task"
        icon={Icon.Plus}
        onAction={() => handleLaunchCommand("add-task")}
      />

      <MenuBarExtra.Item
        title="Open Tasks File in Obsidian"
        icon={Icon.Link}
        onAction={handleOpenInObsidian}
      />
      <MenuBarExtra.Item
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      />
    </>
  );

  if (isLoading) {
    return (
      <MenuBarExtra icon={Icon.Clock} tooltip="Loading tasks...">
        <MenuBarExtra.Item title="Obsidian Tasks is loading..." />
      </MenuBarExtra>
    );
  }

  if (!topTask) {
    return (
      <MenuBarExtra title="No Tasks" tooltip="No pending tasks">
        {BottomSection}
      </MenuBarExtra>
    );
  }

  const icon = preferences.menubarTaskCount
    ? Icon.CheckList
    : priorityToIcon(topTask.priority).icon;

  return (
    <MenuBarExtra title={getMenubarTitle(topTask)} {...(preferences.showIcon ? { icon } : {})}>
      <MenuBarExtra.Item
        title="Mark as Done"
        icon={Icon.Checkmark}
        onAction={() => handleDone(topTask)}
      />

      <MenuBarExtra.Section>
        {allTasks?.map((task) => (
          <MenuBarExtra.Submenu
            key={task.id}
            title={`${getFormattedDescription(task, maxLength)}`}
            icon={priorityToIcon(task.priority).icon}
          >
            <MenuBarExtra.Item
              title="Mark as Done"
              icon={Icon.Checkmark}
              onAction={() => handleDone(task)}
            />
            <MenuBarExtra.Submenu title="Set Priority" icon={Icon.ArrowUp}>
              {PRIORITY_VALUES.map((priority) => (
                <MenuBarExtra.Item
                  key={priority}
                  title={`${priority}`}
                  icon={priorityToIcon(priority).icon}
                  onAction={() => handleSetPriority(task, priority)}
                />
              ))}
            </MenuBarExtra.Submenu>
            <MenuBarExtra.Item
              title="Edit Task"
              icon={Icon.Pencil}
              onAction={() => handleEditTask(task)}
            />
            <MenuBarExtra.Item
              title="Delete Task"
              icon={Icon.Trash}
              onAction={() => handleDeleteTask(task)}
            />
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>{BottomSection}</MenuBarExtra.Section>
    </MenuBarExtra>
  );
};

export default Command;
