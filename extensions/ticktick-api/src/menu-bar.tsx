import {
  Color,
  Icon,
  MenuBarExtra,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useAllTasks } from "./hooks/useTasks";
import { useProjects } from "./hooks/useProjects";
import { completeTask } from "./api";
import { PRIORITY_COLORS } from "./constants";

export default function MenuBarCommand() {
  const { tasks, isLoading, revalidate } = useAllTasks();
  const { projects } = useProjects();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTasks = tasks.filter((t) => {
    if (t.status !== 0 || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return (
      due.getTime() >= today.getTime() && due.getTime() < tomorrow.getTime()
    );
  });

  const overdueTasks = tasks.filter((t) => {
    if (t.status !== 0 || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  });

  const totalDue = todayTasks.length + overdueTasks.length;
  const title = totalDue > 0 ? `${totalDue}` : undefined;

  return (
    <MenuBarExtra
      icon={{
        source: Icon.CheckCircle,
        tintColor: totalDue > 0 ? Color.Blue : Color.SecondaryText,
      }}
      title={title}
      tooltip={`${totalDue} task${totalDue !== 1 ? "s" : ""} due today`}
      isLoading={isLoading}
    >
      {overdueTasks.length > 0 && (
        <MenuBarExtra.Section title={`Overdue (${overdueTasks.length})`}>
          {overdueTasks.slice(0, 5).map((task) => (
            <MenuBarExtra.Item
              key={task.id}
              title={task.title}
              icon={{
                source: Icon.Circle,
                tintColor:
                  PRIORITY_COLORS[task.priority] ?? Color.SecondaryText,
              }}
              subtitle={projects.find((p) => p.id === task.projectId)?.name}
              onAction={async () => {
                try {
                  await completeTask(task.projectId, task.id);
                  await showHUD(`Completed: ${task.title}`);
                  revalidate();
                } catch (err) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
                    message: String(err),
                  });
                }
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title={`Today (${todayTasks.length})`}>
        {todayTasks.length === 0 && (
          <MenuBarExtra.Item title="All clear for today" icon={Icon.Sun} />
        )}
        {todayTasks.slice(0, 10).map((task) => (
          <MenuBarExtra.Item
            key={task.id}
            title={task.title}
            icon={{
              source: Icon.Circle,
              tintColor: PRIORITY_COLORS[task.priority] ?? Color.SecondaryText,
            }}
            subtitle={projects.find((p) => p.id === task.projectId)?.name}
            onAction={async () => {
              try {
                await completeTask(task.projectId, task.id);
                await showHUD(`Completed: ${task.title}`);
                revalidate();
              } catch (err) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed",
                  message: String(err),
                });
              }
            }}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open TickTick"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("https://ticktick.com/webapp/")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
