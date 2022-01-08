import { List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { getNext7Days } from "./service/osScript";
import { Section } from "./service/task";
import useStartApp from "./hooks/useStartApp";
import useSearchTasks from "./hooks/useSearchTasks";
import TaskItem from "./components/taskItem";

const TickTickNext7Days: React.FC<Record<string, never>> = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sections, setSections] = useState<Section[] | null>(null);
  const { isInitCompleted } = useStartApp();

  useEffect(() => {
    const getTasks = async () => {
      const tasks = await getNext7Days();
      setSections(tasks);
    };

    if (isInitCompleted) {
      getTasks();
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
    return sections == null;
  }, [isInitCompleted, searchQuery, searchTasks, sections]);

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
        : sections?.map((section) => {
            return (
              <List.Section key={section.id} title={`${section.name}`} subtitle={`${section.children.length}`}>
                {section.children.map((task) => (
                  <TaskItem
                    key={task.id}
                    actionType="week"
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

export default TickTickNext7Days;
