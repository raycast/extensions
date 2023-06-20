import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useTaskCommand, useShowDetails } from "./hooks/tasks.hook";
import { Dropdown, Item } from "./components";
import { useViews } from "./hooks";
import NewTask from "./components/form-task/form-task.component";
import { Task } from "./core/types";

export default function () {
  const { isShowingDetail, toggleDetail } = useShowDetails();
  const { view, views, onChange, goToView } = useViews("next");
  const { isLoading, items, revalidate, onSave } = useTaskCommand(view);
  const revalidateAll = () => {
    views.revalidateProjects();
    views.revalidateTags();
    revalidate();
  };
  const saveAndRevalidate = (task: Partial<Task>) =>
    onSave(task).then(() => {
      views.revalidateProjects();
      views.revalidateTags();
    });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search tasks"
      searchBarAccessory={<Dropdown value={view} views={views} onChange={onChange} />}
      actions={
        <ActionPanel>
          <Action.Push
            key="tasks_action_new"
            title="Add New Task…"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            icon={{ source: Icon.NewDocument, tintColor: Color.Green }}
            target={<NewTask onSave={saveAndRevalidate} />}
          />
          <ActionPanel.Submenu title="Reload…" icon={Icon.Repeat}>
            <Action key="tasks_action_revalidate_tasks" title="Tasks" icon={Icon.BulletPoints} onAction={revalidate} />
            <Action
              key="tasks_action_revalidate_projects"
              title="Projects"
              icon={Icon.Tray}
              onAction={views.revalidateProjects}
            />
            <Action key="tasks_action_revalidate_tags" title="Tags" icon={Icon.Tag} onAction={views.revalidateTags} />
            <Action
              key="tasks_action_revalidate_all"
              title="All"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={revalidateAll}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <List.Section key="tasks_list_section" title={`${items?.length ?? 0} tasks`}>
        {items.map((task, i) => (
          <Item
            key={`task_${i}`}
            task={task}
            views={views}
            goToView={goToView}
            revalidate={revalidate}
            toggleDetail={toggleDetail}
            isShowingDetail={isShowingDetail}
            onSave={saveAndRevalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}
