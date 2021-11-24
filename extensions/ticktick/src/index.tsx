import { ActionPanel, Color, Icon, List, OpenAction } from "@raycast/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getSearchByKeyword, getToday } from "./service/osScript";
import { Section, Task } from "./service/task";
import { getProjectNameById } from "./service/project";
import useStartApp from "./hooks/useStartApp";

const TickTickToday: React.FC<{}> = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [todaySections, setTodaySections] = useState<Section[] | null>(null);
  const [searchTasks, setSearchTasks] = useState<Task[] | null>(null);
  const { isInitCompleted } = useStartApp();

  useEffect(() => {
    const getTodayTasks = async () => {
      const today = await getToday();
      setTodaySections(today);
    };

    if (isInitCompleted) {
      getTodayTasks();
    }
  }, [isInitCompleted]);

  useEffect(() => {
    const getSearchTasks = async () => {
      const search = await getSearchByKeyword(searchQuery);
      setSearchTasks(search);
    };

    if (!searchQuery) {
      setSearchTasks(null);
    } else {
      if (isInitCompleted) {
        getSearchTasks();
      }
    }
  }, [isInitCompleted, searchQuery]);

  const isLoading = useMemo(() => {
    if (!isInitCompleted) {
      return true;
    }

    if (searchQuery) {
      return searchTasks == null;
    }
    return todaySections == null;
  }, [isInitCompleted, searchQuery, searchTasks, todaySections]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchQuery} searchBarPlaceholder="Search all tasks...">
      {searchTasks
        ? searchTasks.map((task) => (
            <TaskItem
              key={task.id}
              actionType="project"
              id={task.id}
              title={task.title}
              projectId={task.projectId}
              priority={task.priority}
            />
          ))
        : todaySections?.map((section) => {
            return (
              <List.Section key={section.id} title={`${section.name}`} subtitle={`${section.children.length}`}>
                {section.children.map((task) => (
                  <TaskItem
                    key={task.id}
                    actionType="smartProject"
                    id={task.id}
                    title={task.title}
                    projectId={task.projectId}
                    priority={task.priority}
                  />
                ))}
              </List.Section>
            );
          })}
    </List>
  );
};

export default TickTickToday;

const TaskItem: React.FC<{
  id: Task["id"];
  title: Task["title"];
  priority: Task["priority"];
  projectId: Task["projectId"];
  actionType: "smartProject" | "project";
}> = (props) => {
  const { id, title, priority, projectId, actionType } = props;

  const projectName = useMemo(() => {
    return getProjectNameById(projectId) || "";
  }, [projectId]);

  const getCheckboxColor = useCallback((priority: Task["priority"]) => {
    switch (priority) {
      case 0:
        return Color.PrimaryText;
      case 1:
        return Color.Blue;
      case 3:
        return Color.Yellow;
      case 5:
        return Color.Red;
      default:
        return Color.PrimaryText;
    }
  }, []);

  const target = useMemo(() => {
    if (actionType === "smartProject") {
      return `ticktick://widget.view.task.in.smartproject/today/${id}`;
    }
    return `ticktick://widget.view.task.in.project/${projectId}/${id}`;
  }, [actionType, id, projectId]);

  return (
    <List.Item
      title={title || "Untitled"}
      icon={{ source: Icon.Circle, tintColor: getCheckboxColor(priority) }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <OpenAction title="Open in TickTick" target={target} icon={Icon.Window} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessoryTitle={projectName}
    />
  );
};
