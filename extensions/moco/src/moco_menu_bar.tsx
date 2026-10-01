import { environment, getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { startActivity, toggleActivity } from "./commands/activities/api";
import { Activity, StartActivityRequest } from "./commands/activities/types";
import { timeDelta, secondsParser, currentActivity, localDate } from "./commands/activities/utils";
import { Project } from "./commands/projects/types";
import { Customer } from "./commands/customers/types";
import { Task } from "./commands/tasks/types";
import { Preferences } from "./types";
import { refreshCache, refreshTodaysActivities } from "./utils/refresh";
import { useStatuses } from "./utils/useStatuses";
import { openMenuBarTool } from "./commands/menu-bar/tools";
import {
  CustomerLayout,
  getCustomerLayouts,
  getFavoriteOrder,
  getProjects,
  getShowTotalTime,
  getTodaysActivities,
  sortByFavoriteOrder,
  StatusType,
} from "./utils/storage";

export default function Command() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [customerLayouts, setCustomerLayouts] = useState<Record<number, CustomerLayout>>({});
  const [favoriteOrder, setFavoriteOrder] = useState<number[]>([]);
  const [showTotalTime, setShowTotalTime] = useState<boolean>(true);
  const projectStatusState = useStatuses("project");
  const taskStatusState = useStatuses("task");
  const projectStatuses = projectStatusState.statuses ?? new Map<number, StatusType>();
  const taskStatuses = taskStatusState.statuses ?? new Map<number, StatusType>();
  const changeProjectStatus = projectStatusState.changeStatus;
  const changeTaskStatus = taskStatusState.changeStatus;

  // Reload today's activities from the API after a timer action. The cache only updates on the next
  // background run, so reading it here would show the old state for up to 30s.
  const refreshItems = async () => {
    setIsLoading(true);
    try {
      setActivities(await refreshTodaysActivities());
    } finally {
      setIsLoading(false);
    }
  };

  const buildCustomerMaps = (projects: Project[]) => {
    const projectMap: Map<number | null, Project[]> = new Map();
    const customerMap: Map<number | null, Customer | null> = new Map();
    customerMap.set(null, null);
    projects.forEach((project) => {
      const customer = project.customer;
      if (!customer) {
        return;
      }

      if (!projectMap.has(customer.id)) {
        projectMap.set(customer.id, []);
      }
      projectMap.get(customer.id)?.push(project);

      if (!customerMap.has(customer.id)) {
        customerMap.set(customer.id, customer);
      }
    });
    return { projectMap, customerMap };
  };

  // Load everything first and set the state in one go. Raycast keeps showing the previous menu while
  // isLoading is true, so a partial state (activities without projects) would render as a flicker.
  const load = async (forceRefresh: boolean) => {
    setIsLoading(true);
    // try/finally: a failing cache read must not leave the menu in the loading state.
    try {
      const [cachedActivities, cachedProjects, layouts, order, showTotal] = await Promise.all([
        getTodaysActivities(),
        getProjects(),
        getCustomerLayouts(),
        getFavoriteOrder(),
        getShowTotalTime(),
      ]);
      let activities = cachedActivities;
      let projects = cachedProjects;
      // Background runs (every 30s, menu closed) refresh the cache from the API. A click only reads the cache,
      // so the menu opens without waiting for the API. A click fetches too when the cache is empty (first run)
      // or holds activities of another day (after midnight or sleep, before the next background run).
      const isStale = cachedActivities.some((activity) => activity.date !== localDate());
      const isBackground = environment.launchType === LaunchType.Background;
      if (forceRefresh || isBackground || cachedProjects.length === 0 || isStale) {
        try {
          ({ activities, projects } = await refreshCache());
        } catch (error) {
          console.error("Error refreshing the MOCO cache", error);
        }
      }
      setCustomerLayouts(layouts);
      setShowTotalTime(showTotal);
      setFavoriteOrder(order);
      setActivities(activities);
      setProjects(projects.filter((project) => project.contract?.active !== false));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(false).catch((error) => console.error("Error loading the MOCO menu bar", error));
  }, []);

  // Hidden projects (project list) and hidden or inactive tasks stay out of the menu.
  // A project without any visible task is left out as well.
  const isTaskVisible = (task: Task) => task.active !== false && taskStatuses.get(task.id) !== StatusType.hidden;
  const visibleProjects = projects
    .filter((project) => projectStatuses.get(project.id) !== StatusType.hidden)
    .map((project) => ({ ...project, tasks: project.tasks.filter(isTaskVisible) }))
    .filter((project) => project.tasks.length > 0);
  // Favorite tasks show on top, also when their project is hidden. Inactive tasks stay out.
  const favoriteTasks = sortByFavoriteOrder(
    projects.flatMap((project) =>
      project.tasks
        .filter((task) => task.active !== false && taskStatuses.get(task.id) === StatusType.favorite)
        .map((task) => ({ project, task })),
    ),
    favoriteOrder,
    ({ task }) => task.id,
  );
  const hiddenProjects = projects.filter((project) => projectStatuses.get(project.id) === StatusType.hidden);
  const hiddenCustomerMaps = buildCustomerMaps(hiddenProjects);
  const hiddenTasks = projects.flatMap((project) =>
    project.tasks.filter((task) => taskStatuses.get(task.id) === StatusType.hidden).map((task) => ({ project, task })),
  );
  const hiddenTasksOf = (projectID: number) =>
    hiddenTasks.filter(({ project }) => project.id === projectID).map(({ task }) => task);
  const { projectMap: customerProjectsMap, customerMap } = buildCustomerMaps(visibleProjects);

  // A task row: click starts the timer, right-click opens the actions window ("context menu").
  const renderTaskRow = (project: Project, task: Task, keyPrefix = "task", subtitle?: string) => (
    <MenuBarExtra.Item
      key={`${keyPrefix}-${task.id}`}
      icon={keyPrefix === "favorite" ? Icon.Star : undefined}
      title={task.name}
      subtitle={subtitle}
      tooltip="Click: start timer · Right-click: more actions"
      onAction={async (event: MenuBarExtra.ActionEvent) => {
        if (event.type === "right-click") {
          await openMenuBarTool({
            view: "task-actions",
            task: { ...task, projectID: project.id, projectName: project.name },
            isFavorite: taskStatuses.get(task.id) === StatusType.favorite,
          });
          return;
        }
        const values: StartActivityRequest = {
          date: localDate(),
          description: task.name,
          hours: "",
          projectID: project.id,
          taskID: task.id,
        };
        await startActivity(values);
        await refreshItems();
      }}
    />
  );

  // A project submenu: project actions row, then its tasks and hidden tasks.
  const renderProject = (project: Project) => (
    <MenuBarExtra.Submenu key={`project-${project.id}`} title={project.name}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          key={`project-actions-${project.id}`}
          icon={Icon.Gear}
          title={project.name}
          tooltip="Click: project actions"
          onAction={() => openMenuBarTool({ view: "project-actions", project: { id: project.id, name: project.name } })}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {project.tasks.map((task) => renderTaskRow(project, task))}
        {hiddenTasksOf(project.id).length > 0 ? (
          <MenuBarExtra.Submenu key={`hidden-${project.id}`} icon={Icon.EyeDisabled} title="Hidden">
            {hiddenTasksOf(project.id).map((task) => (
              <MenuBarExtra.Item
                key={`hidden-task-${task.id}`}
                icon={Icon.Eye}
                title={task.name}
                tooltip="Click to unhide"
                onAction={() => changeTaskStatus(task.id, undefined)}
              />
            ))}
          </MenuBarExtra.Submenu>
        ) : null}
      </MenuBarExtra.Section>
    </MenuBarExtra.Submenu>
  );

  const runningActivity = activities.find((activity) => activity.timer_started_at !== null);
  const timerActivity = currentActivity(activities);

  function sumUpActivities(activities: Activity[]) {
    const secondSum = activities.reduce((acc, activity) => acc + activity.seconds, 0);

    if (runningActivity !== undefined && runningActivity.timer_started_at !== null) {
      return secondsParser(secondSum + timeDelta(runningActivity.timer_started_at));
    }

    return secondsParser(secondSum);
  }

  const totalTime = sumUpActivities(activities);
  const totalHoursMinutes = totalTime.slice(0, totalTime.lastIndexOf(":"));
  // Render the menu only once data and statuses are known, see the comment in useEffect.
  const isMenuLoading = isLoading || projectStatusState.isLoading || taskStatusState.isLoading;

  return (
    <MenuBarExtra
      isLoading={isMenuLoading}
      icon={{ source: runningActivity ? "MocoLogoRunning.png" : "MocoLogo.png" }}
      // Total time of today as h:mm. Raycast re-runs the command every 30s (package.json interval).
      title={isMenuLoading || !showTotalTime ? undefined : totalHoursMinutes}
      tooltip={`Timer ${runningActivity ? "Running" : "Not running"}`}
    >
      {timerActivity ? (
        <MenuBarExtra.Submenu icon={runningActivity ? Icon.Play : Icon.Pause} title={timerActivity.task.name}>
          <MenuBarExtra.Item
            title={timerActivity.project.name}
            tooltip={`Project: ${timerActivity.project.name}\nTask: ${timerActivity.task.name}\nDescription: ${timerActivity.description}`}
          />
          {runningActivity ? (
            <MenuBarExtra.Item
              icon={Icon.Stop}
              title="Stop Timer"
              onAction={() => toggleActivity(timerActivity.id, false).then(() => refreshItems())}
            />
          ) : (
            <MenuBarExtra.Item
              icon={Icon.Play}
              title="Continue Timer"
              onAction={() => toggleActivity(timerActivity.id, true).then(() => refreshItems())}
            />
          )}
          <MenuBarExtra.Item
            icon={Icon.Pencil}
            title="Edit…"
            onAction={() =>
              launchCommand({
                name: "edit_timer",
                type: LaunchType.UserInitiated,
                context: { activity: timerActivity },
              })
            }
          />
        </MenuBarExtra.Submenu>
      ) : null}

      <MenuBarExtra.Submenu icon={Icon.Calendar} title={`Today · ${totalHoursMinutes} (${activities.length})`}>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            key="add-activity"
            icon={Icon.Plus}
            title="Add Activity…"
            tooltip="Book hours or start a timer for any project and task"
            onAction={() => launchCommand({ name: "start_timer", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            key="open-dashboard"
            icon={Icon.Globe}
            title="Open Activities in MOCO"
            tooltip="Opens the MOCO time tracking page in the default browser"
            onAction={() => open(`https://${getPreferenceValues<Preferences>().url_prefix}.mocoapp.com/activities`)}
          />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          {[...activities]
            .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
            .map((activity) => {
              const isRunning = activity.timer_started_at !== null;
              const seconds =
                activity.seconds + (activity.timer_started_at !== null ? timeDelta(activity.timer_started_at) : 0);
              const time = secondsParser(seconds);
              return (
                <MenuBarExtra.Item
                  key={`today-${activity.id}`}
                  icon={isRunning ? Icon.Play : undefined}
                  title={activity.task.name}
                  subtitle={time.slice(0, time.lastIndexOf(":"))}
                  tooltip={`Project: ${activity.project.name}\nTask: ${activity.task.name}\nDescription: ${activity.description}\n\nClick: ${isRunning ? "stop" : "continue"} timer · Right-click: edit`}
                  onAction={async (event: MenuBarExtra.ActionEvent) => {
                    if (event.type === "right-click") {
                      await launchCommand({
                        name: "edit_timer",
                        type: LaunchType.UserInitiated,
                        context: { activity },
                      });
                      return;
                    }
                    await toggleActivity(activity.id, !isRunning);
                    await refreshItems();
                  }}
                />
              );
            })}
        </MenuBarExtra.Section>
      </MenuBarExtra.Submenu>

      {favoriteTasks.length > 0 ? (
        <MenuBarExtra.Section title="Favorites">
          {favoriteTasks.map(({ project, task }) => renderTaskRow(project, task, "favorite", project.name))}
        </MenuBarExtra.Section>
      ) : null}

      {/* Customers set to "Inline" in the settings: one section each, the customer name as section title. */}
      {Array.from(customerMap.entries()).map(([customerId, customer]) => {
        const projects = customerProjectsMap.get(customerId) ?? [];
        if (projects.length === 0) {
          return null;
        }
        const customerKey = customerId ?? 0;
        // Default is "inline". Submenu customers render below, hidden customers not at all.
        if ((customerLayouts[customerKey] ?? CustomerLayout.inline) !== CustomerLayout.inline) {
          return null;
        }
        return (
          <MenuBarExtra.Section key={`customer-${customerKey}`} title={customer?.name ?? "Other"}>
            {projects.map(renderProject)}
          </MenuBarExtra.Section>
        );
      })}

      {/* Customers set to "Submenu" in the settings: one row each, projects inside. */}
      <MenuBarExtra.Section>
        {Array.from(customerMap.entries()).map(([customerId, customer]) => {
          const projects = customerProjectsMap.get(customerId) ?? [];
          const customerKey = customerId ?? 0;
          if (projects.length === 0 || customerLayouts[customerKey] !== CustomerLayout.submenu) {
            return null;
          }
          return (
            <MenuBarExtra.Submenu key={`customer-submenu-${customerKey}`} title={customer?.name ?? "Other"}>
              {projects.map(renderProject)}
            </MenuBarExtra.Submenu>
          );
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => load(true).catch((error) => console.error("Error loading the MOCO menu bar", error))}
        />
        {hiddenProjects.length > 0 ? (
          <MenuBarExtra.Submenu icon={Icon.EyeDisabled} title="Hidden Projects">
            {Array.from(hiddenCustomerMaps.customerMap.entries()).flatMap(([customerId, customer]) => {
              const projects = hiddenCustomerMaps.projectMap.get(customerId) ?? [];
              if (projects.length === 0) {
                return [];
              }
              return [
                <MenuBarExtra.Item
                  key={`hidden-customer-${customerId ?? "other"}`}
                  title={customer?.name ?? "Other"}
                />,
                ...projects.map((project) => (
                  <MenuBarExtra.Item
                    key={`hidden-project-${project.id}`}
                    icon={Icon.Eye}
                    title={project.name}
                    tooltip="Click to unhide"
                    onAction={() => changeProjectStatus(project.id, undefined)}
                  />
                )),
              ];
            })}
          </MenuBarExtra.Submenu>
        ) : null}

        {hiddenTasks.length > 0 ? (
          <MenuBarExtra.Submenu icon={Icon.EyeDisabled} title="Hidden Tasks">
            {hiddenTasks.map(({ project, task }) => (
              <MenuBarExtra.Item
                key={`hidden-task-${task.id}`}
                icon={Icon.Eye}
                title={`${project.name} / ${task.name}`}
                tooltip="Click to unhide"
                onAction={() => changeTaskStatus(task.id, undefined)}
              />
            ))}
          </MenuBarExtra.Submenu>
        ) : null}
        {favoriteTasks.length > 0 ? (
          <MenuBarExtra.Item
            icon={Icon.Star}
            title="Manage Favorites…"
            tooltip="Start a favorite or change their order"
            onAction={() => openMenuBarTool({ view: "favorites" })}
          />
        ) : null}
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title="Menu Bar Settings…"
          onAction={() => openMenuBarTool({ view: "settings" })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
