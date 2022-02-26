import { List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { getToday } from "./service/osScript";
import { Section } from "./service/task";
import useStartApp from "./hooks/useStartApp";
import TaskItem from "./components/taskItem";
import useSearchTasks from "./hooks/useSearchTasks";

const TickTickToday: React.FC<Record<string, never>> = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [todaySections, setTodaySections] = useState<Section[] | null>(null);
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

  const { searchTasks } = useSearchTasks({ searchQuery, isInitCompleted });

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
                    actionType="today"
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
