import { Task } from "@doist/todoist-api-typescript";
import { Color, confirmAlert, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import removeMarkdown from "remove-markdown";
import { todoist } from "../api";
import { priorities } from "../constants";
import { isTodoistInstalled } from "../helpers/isTodoistInstalled";
import { useCachedFocusedTask } from "../helpers/cachedFocusedTask";
import View from "./View";

interface MenubarTaskProps {
  task: Task;
  mutateTasks: MutatePromise<Task[] | undefined>;
}

const MenubarTask = ({ task, mutateTasks }: MenubarTaskProps) => {
  const { cachedFocusedTask, setCachedFocusedTask, clearCachedFocusedTask } = useCachedFocusedTask();
  const priority = priorities.find((p) => p.value === task.priority);

  async function focusTask({ id, content }: Task) {
    await showHUD(`🎯 Focus on "${content}"`);

    setCachedFocusedTask({ id, content });
  }

  async function unfocusTask() {
    await showHUD(`👋 No more focus`);

    clearCachedFocusedTask();
  }

  async function completeTask(task: Task) {
    await showHUD("⏰ Completing task");
    try {
      await todoist.closeTask(task.id);
      await showHUD("Task completed 🙌");
      cachedFocusedTask.id === task.id && clearCachedFocusedTask();
      mutateTasks();
    } catch (error) {
      showHUD("Unable to complete task ❌");
    }
  }

  async function changeDueDate(task: Task, dueString: string) {
    await showHUD("⏰ Updating task due date");

    try {
      await todoist.updateTask(task.id, { dueString });
      await showHUD("Updated task due date 🙌");
      mutateTasks();
    } catch (error) {
      console.log(error);
      showHUD("Unable to update task due date ❌");
    }
  }

  async function changePriority(task: Task, priority: number) {
    await showHUD("⏰ Updating task priority");

    try {
      await todoist.updateTask(task.id, { priority });
      await showHUD("Task Priority Updated 🙌");
      mutateTasks();
    } catch (error) {
      console.log(error);
      showHUD("Unable to update task priority ❌");
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
      await showHUD("⏰ Deleting task");

      try {
        await todoist.deleteTask(task.id);
        await showHUD("Task deleted 🙌");

        mutateTasks();
      } catch (error) {
        console.log(error);
        showHUD("Unable to delete task ❌");
      }
    }
  }

  return (
    <View>
      <MenuBarExtra.Submenu
        title={removeMarkdown(task.content)}
        icon={priority && priority.value === 1 ? Icon.Circle : { source: Icon.Circle, tintColor: priority?.color }}
      >
        {cachedFocusedTask.id !== task.id ? (
          <MenuBarExtra.Item title="Focus Task" onAction={() => focusTask(task)} icon={Icon.Center} />
        ) : (
          <MenuBarExtra.Item title="Unfocus Task" onAction={() => unfocusTask()} icon={Icon.MinusCircle} />
        )}

        <MenuBarExtra.Item title="Complete Task" onAction={() => completeTask(task)} icon={Icon.Checkmark} />
        <MenuBarExtra.Item
          title="Open in Todoist"
          onAction={() => {
            isTodoistInstalled ? open(`todoist://task?id=${task.id}`) : open(task.url);
          }}
          icon={isTodoistInstalled ? "todoist.png" : Icon.Globe}
        />
        <MenuBarExtra.Submenu title="Change Due Date" icon={Icon.Clock}>
          <MenuBarExtra.Item title="Today" icon={Icon.Calendar} onAction={() => changeDueDate(task, "today")} />
          <MenuBarExtra.Item title="Tomorrow" icon={Icon.Sunrise} onAction={() => changeDueDate(task, "tomorrow")} />
          <MenuBarExtra.Item
            title="Next Week"
            icon={Icon.ArrowClockwise}
            onAction={() => changeDueDate(task, "next week")}
          />
          <MenuBarExtra.Item title="Next Weekend" icon={"🌴"} onAction={() => changeDueDate(task, "next weekend")} />
          <MenuBarExtra.Item title="No Due Date" icon={Icon.XMarkCircle} onAction={() => changeDueDate(task, "")} />
        </MenuBarExtra.Submenu>
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

        <MenuBarExtra.Item title="Delete Task" onAction={() => deleteTask(task)} icon={Icon.Trash} />
      </MenuBarExtra.Submenu>
    </View>
  );
};

export default MenubarTask;
