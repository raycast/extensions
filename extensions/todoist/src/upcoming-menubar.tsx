import { Icon, MenuBarExtra, openCommandPreferences, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { handleError, todoist } from "./api";
import { getSectionsWithDueDates } from "./helpers/sections";
import { checkTodoistApp, isTodoistInstalled } from "./helpers/isTodoistInstalled";
import { useEffect } from "react";
import MenubarTask from "./components/MenuBarTask";

export default function Command() {
  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useCachedPromise(() => todoist.getTasks({ filter: "all" }));

  if (tasksError) {
    handleError({ error: tasksError, title: "Unable to get tasks" });
  }

  const upcomingTasks = tasks?.filter((task) => task.due?.date) || [];
  const sections = getSectionsWithDueDates(upcomingTasks);

  useEffect(() => {
    checkTodoistApp();
  }, []);

  return (
    <MenuBarExtra
      icon={{
        source: "todoist.png",
      }}
      isLoading={isLoadingTasks}
    >
      {sections.map((section, index) => {
        return (
          <MenuBarExtra.Section title={section.name} key={index}>
            {section.tasks.map((task) => (
              <MenubarTask key={task.id} task={task} />
            ))}
          </MenuBarExtra.Section>
        );
      })}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
