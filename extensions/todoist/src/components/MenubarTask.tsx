import { Task } from "@doist/todoist-api-typescript";
import { Color, confirmAlert, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import removeMarkdown from "remove-markdown";

import { todoist } from "../api";
import { priorities } from "../constants";
import { isTodoistInstalled } from "../helpers/isTodoistInstalled";
import { useFocusedTask } from "../hooks/useFocusedTask";

import View from "./View";

interface MenuBarTaskProps {
  task: Task;
  mutateTasks: MutatePromise<Task[] | undefined>;
}

const MenuBarTask = ({ task, mutateTasks }: MenuBarTaskProps) => {
  const { focusedTask, unfocusTask, focusTask } = useFocusedTask();

  const priority = priorities.find((p) => p.value === task.priority);

  async function completeTask(task: Task) {
    try {
      await mutateTasks(todoist.closeTask(task.id), {
        optimisticUpdate(data) {
          if (!data) {
            return;
          }

          return data.filter((t) => t.id !== task.id);
        },
      });

      if (focusedTask.id === task.id) {
        unfocusTask();
      }

      await showHUD("Completed task 🙌");
    } catch (error) {
      showHUD("Unable to complete task ❌");
    }
  }

  async function changeDueDate(task: Task, dueString: string) {
    try {
      await todoist.updateTask(task.id, { dueString });
      // Mutating the task optimistically here is a bit tricky so let's not do it
      await mutateTasks();
      await showHUD("Updated task due date");
    } catch (error) {
      console.log(error);
      showHUD("Unable to update task due date ❌");
    }
  }

  async function changePriority(task: Task, priority: number) {
    try {
      await mutateTasks(todoist.updateTask(task.id, { priority }), {
        optimisticUpdate(data) {
          if (!data) {
            return;
          }

          return data.map((t) => {
            if (t.id === task.id) {
              return { ...t, priority };
            }

            return t;
          });
        },
      });

      await showHUD("Updated task priority");
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
      try {
        await mutateTasks(todoist.deleteTask(task.id), {
          optimisticUpdate(data) {
            if (!data) {
              return;
            }

            return data.filter((t) => t.id !== task.id);
          },
        });
        await showHUD("Deleted task");
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
        {focusedTask.id !== task.id ? (
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
          <MenuBarExtra.Item
            title="No Due Date"
            icon={Icon.XMarkCircle}
            onAction={() => changeDueDate(task, "no due date")}
          />
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

export default MenuBarTask;
