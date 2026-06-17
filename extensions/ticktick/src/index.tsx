import { List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { getToday } from "./service/osScript";
import { getTaskCopyContent, getTaskDetailMarkdownContent, Section } from "./service/task";
import useStartApp from "./hooks/useStartApp";
import TaskItem from "./components/taskItem";
import useSearchTasks from "./hooks/useSearchTasks";
import useRefreshList from "./hooks/useRefreshList";

const TickTickToday: React.FC<Record<string, never>> = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [todaySections, setTodaySections] = useState<Section[] | null>(null);
  const { isInitCompleted } = useStartApp();
  const { refreshPoint, refresh } = useRefreshList();

  useEffect(() => {
    console.log("refreshPoint", refreshPoint);
    const getTodayTasks = async () => {
      const today = await getToday();
      setTodaySections(today);
    };

    if (isInitCompleted) {
      getTodayTasks();
    }
  }, [isInitCompleted, refreshPoint]);

  const { searchTasks, isSearching } = useSearchTasks({ searchQuery, isInitCompleted });

  const isLoading = useMemo(() => {
    if (!isInitCompleted) {
      return true;
    }

    if (searchQuery) {
      return isSearching;
    }
    return todaySections == null;
  }, [isInitCompleted, searchQuery, isSearching, todaySections]);

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
              dueDate={task.dueDate}
              startDate={task.startDate}
              isFloating={task.isFloating}
              isAllDay={task.isAllDay}
              timeZone={task.timeZone}
              detailMarkdown={getTaskDetailMarkdownContent(task)}
              tags={task.tags}
              copyContent={getTaskCopyContent(task)}
              refresh={refresh}
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
                    dueDate={task.dueDate}
                    startDate={task.startDate}
                    isFloating={task.isFloating}
                    isAllDay={task.isAllDay}
                    timeZone={task.timeZone}
                    tags={task.tags}
                    detailMarkdown={getTaskDetailMarkdownContent(task)}
                    copyContent={getTaskCopyContent(task)}
                    refresh={refresh}
                  />
                ))}
              </List.Section>
            );
          })}
    </List>
  );
};

export default TickTickToday;
