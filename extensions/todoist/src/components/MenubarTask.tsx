import { Task } from "@doist/todoist-api-typescript";
import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useEffect } from "react";
import { priorities } from "../constants";
import { checkTodoistApp, isTodoistInstalled } from "../helpers/isTodoistInstalled";

interface MenubarTaskProps {
  task: Task;
}

const MenubarTask = ({ task }: MenubarTaskProps) => {
  useEffect(() => {
    checkTodoistApp();
  }, []);

  const priority = priorities.find((p) => p.value === task.priority);

  return (
    <MenuBarExtra.Submenu
      title={task.content}
      icon={priority && priority.value === 1 ? Icon.Circle : { source: Icon.Circle, tintColor: priority?.color }}
    >
      <MenuBarExtra.Item
        title="Open in Todoist"
        onAction={() => {
          isTodoistInstalled ? open(`todoist://task?id=${task.id}`) : open(task.url);
        }}
        icon={isTodoistInstalled ? "todoist.png" : Icon.Globe}
      />
    </MenuBarExtra.Submenu>
  );
};

export default MenubarTask;
