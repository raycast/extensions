import { List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { getNext7Days } from "./service/osScript";
import { getTaskDetailMarkdownContent, Section } from "./service/task";
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

  const { searchTasks, isSearching } = useSearchTasks({ searchQuery, isInitCompleted });

  const isLoading = useMemo(() => {
    if (!isInitCompleted) {
      return true;
    }

    if (searchQuery) {
      return isSearching;
    }
    return sections == null;
  }, [isInitCompleted, searchQuery, isSearching, sections]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder="Search all tasks..."
      isShowingDetail
    >
      {searchTasks
        ? searchTasks.map((task) => (
            <TaskItem
              key={task.id}
              actionType="project"
              id={task.id}
              title={task.title}
              projectId={task.projectId}
              priority={task.priority}
              tags={task.tags}
              detailMarkdown={getTaskDetailMarkdownContent(task)}
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
                    tags={task.tags}
                    detailMarkdown={getTaskDetailMarkdownContent(task)}
                  />
                ))}
              </List.Section>
            );
          })}
    </List>
  );
};

export default TickTickNext7Days;
