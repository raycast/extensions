import { launchCommand, LaunchType, MenuBarExtra, open, showHUD } from "@raycast/api";
import React from "react";
import UseOAuth from "../../fetch/useOAuth";

import { QueryStartTimer } from "../../queriesFunctions/TimersQueries";
import { getHoursAndMin, progbar } from "../../tools/generalTools";
import { ratioTodos } from "../../tools/filtersTools";
import useDBLinkHook from "../../hooks/DBLinkHook";
import useFetchCacheMenuBar from "../../fetch/useFetchCacheMenuBar";
import { Client } from "@notionhq/client";
import { Todo } from "../../interfaces/interfaceItems";

const PilotMenuBar = () => {
  const { notion } = UseOAuth();
  const { linked } = useDBLinkHook();
  const { refresh, isLoading, projects, timer, todayEvents, todayKeystones } = useFetchCacheMenuBar(
    notion as Client,
    linked,
  );

  //#region HANDLERS
  const handleStartTimer = async () => {
    showHUD("Starting Timer");
    const date = new Date().toISOString();
    await QueryStartTimer(date, notion);
    refresh();
    showHUD("Timer Started !");
  };

  const handleToogleTodo = async (todo: Todo) => {
    launchCommand({
      name: "taskmanager",
      type: LaunchType.UserInitiated,
      context: { type: "toogleTodo", props: { todo: todo } },
    });
  };

  const onStopTimer = () => {
    launchCommand({
      name: "pilot",
      type: LaunchType.UserInitiated,
      context: { type: "endtimerform", props: { timer: timer, projects: projects } },
    });
  };

  const onEventClick = () => {
    launchCommand({ name: "calendar", type: LaunchType.UserInitiated });
  };

  const onLaunchTools = (e: string) => {
    launchCommand({ name: e, type: LaunchType.UserInitiated });
  };
  //#endregion

  //#region ITEMS
  const TimerItem = () => {
    if (isLoading) return <></>;
    if (timer !== null)
      return (
        <MenuBarExtra.Item
          title={"⏰ Stop Timer | started at " + getHoursAndMin(timer?.start as string)}
          onAction={() => onStopTimer()}
        />
      );
    else return <MenuBarExtra.Item title="⏰ Start Timer" onAction={() => handleStartTimer()} />;
  };

  const CalendarItem = () => {
    const orderedEvents = todayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return (
      <MenuBarExtra.Section title="🗓️ Today Calendar">
        {todayKeystones.map((keystone) => {
          const { done } = ratioTodos(keystone.todos);
          return (
            <MenuBarExtra.Submenu
              icon={keystone.project.icon}
              title={keystone.name + " " + progbar(done, keystone.todos.length, false)}
              key={keystone.id}
            >
              {keystone.todos.map((todo) => {
                return (
                  <MenuBarExtra.Item
                    key={todo.id}
                    icon={todo.checkbox ? "✅" : "🟥"}
                    title={todo.name}
                    onAction={() => {
                      handleToogleTodo(todo);
                    }}
                  />
                );
              })}
            </MenuBarExtra.Submenu>
          );
        })}
        {orderedEvents.map((event) => {
          return (
            <MenuBarExtra.Item
              icon={event.project.icon}
              title={event.name}
              subtitle={getHoursAndMin(event.start) + " " + "→" + " " + getHoursAndMin(event.end)}
              key={event.id}
              onAction={() => {
                onEventClick();
              }}
            />
          );
        })}
      </MenuBarExtra.Section>
    );
  };

  const MenuBarTitle = () => {
    const eventsIcon = todayEvents.length !== 0 ? "🗓️ " + todayEvents.length : "";
    const keystonesIcon = todayKeystones.length !== 0 ? "📍 " + todayKeystones.length : "";

    const timerIcon =
      timer !== null ? (Object.keys(timer).length !== 0 ? "⏰ at " + getHoursAndMin(timer?.start as string) : "") : "";
    if (eventsIcon.length === 0 && keystonesIcon.length === 0 && timerIcon.length === 0) return "";
    else return eventsIcon + " " + keystonesIcon + " " + timerIcon;
  };

  const ProjectsItem = () => {
    return (
      <>
        {projects.length !== 0 ? (
          <MenuBarExtra.Section title="📁 Projects">
            {projects.map((project) => {
              return (
                <MenuBarExtra.Submenu title={project.icon + " " + project.name} key={project.id}>
                  {project.links.length === 0 ? (
                    <></>
                  ) : (
                    <MenuBarExtra.Section title="🔗 Links">
                      {project.links.map((l) => {
                        return (
                          <MenuBarExtra.Item
                            title={l.icon + " " + l.name}
                            key={l.id}
                            onAction={() => {
                              open(l.url, l.app);
                            }}
                          />
                        );
                      })}
                    </MenuBarExtra.Section>
                  )}
                  {project.subsProject.length === 0 ? (
                    <></>
                  ) : (
                    <MenuBarExtra.Section title="📃 Pages">
                      {project.subsProject.map((p, i) => {
                        return (
                          <MenuBarExtra.Item
                            title={p.icon + " " + p.name}
                            key={i + project.id}
                            onAction={() => {
                              open(p.url, "Notion");
                            }}
                          />
                        );
                      })}
                    </MenuBarExtra.Section>
                  )}
                </MenuBarExtra.Submenu>
              );
            })}
          </MenuBarExtra.Section>
        ) : (
          <></>
        )}
      </>
    );
  };

  const ToolsItem = () => {
    return (
      <MenuBarExtra.Section title="🔧 Tools">
        <MenuBarExtra.Item title="🗓️ Calendar" onAction={() => onLaunchTools("calendar")} />
        <MenuBarExtra.Item title="📋 Task Manager" onAction={() => onLaunchTools("taskmanager")} />
        <MenuBarExtra.Item title={"📔 Journal"} onAction={() => onLaunchTools("journal")} />
        <TimerItem />
      </MenuBarExtra.Section>
    );
  };

  //#endregion

  return linked ? (
    <MenuBarExtra icon={"🚀"} title={MenuBarTitle()} isLoading={isLoading}>
      {isLoading ? <MenuBarExtra.Item title="LOADING..." /> : <></>}
      <CalendarItem />
      <ProjectsItem />
      <ToolsItem />
    </MenuBarExtra>
  ) : (
    <></>
  );
};

export default PilotMenuBar;
