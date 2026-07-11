import { List, LocalStorage } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { Section, getTaskCopyContent, getTaskDetailMarkdownContent } from "./service/task";
import useStartApp from "./hooks/useStartApp";
import TaskItem from "./components/taskItem";
import useSearchTasks from "./hooks/useSearchTasks";
import { getProjects } from "./service/project";
import SearchFilter from "./components/searchFilter";
import { getTasksByProjectId } from "./service/osScript";
import { usePromise } from "@raycast/utils";
import useRefreshList from "./hooks/useRefreshList";

const TickTickSearch: React.FC<Record<string, never>> = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState("all");
  const { isInitCompleted } = useStartApp();
  const [isLocalDataLoaded, setIsLocalDataLoaded] = useState(false);
  const { refreshPoint, refresh } = useRefreshList();

  useEffect(() => {
    (async () => {
      const defaultProjectId = await LocalStorage.getItem<string>("searchProjectFilter");
      if (defaultProjectId) {
        setProjectFilter(defaultProjectId);
      }
      setIsLocalDataLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (isInitCompleted && isLocalDataLoaded) {
      const projects = getProjects();
      if (projectFilter !== "all" && !projects.find((project) => project.id === projectFilter)) {
        setProjectFilter("all");
      }
    }
  }, [isInitCompleted, isLocalDataLoaded, projectFilter]);

  const filterSections = useMemo(() => {
    if (isInitCompleted || getProjects().length > 0) {
      return [
        { id: "hide", name: "Hide", filters: [{ id: "all", name: "All" }] },
        {
          id: "list",
          name: "Project",
          filters: getProjects().map((project) => ({ id: project.id, name: project.name })),
        },
      ];
    }
    return [];
  }, [isInitCompleted]);

  const { searchTasks, isSearching } = useSearchTasks({ searchQuery, isInitCompleted });

  const { isLoading: isAllTasksLoading, data: sections } = usePromise(
    async (projectId: string, refreshPoint: number) => {
      console.log("refreshPoint", refreshPoint);
      return await getTasksByProjectId(projectId);
    },
    [projectFilter, refreshPoint],
    {
      execute: isLocalDataLoaded,
    }
  );

  const isLoading = useMemo(() => {
    if (!isInitCompleted || !isLocalDataLoaded || isAllTasksLoading) {
      return true;
    }
    return isSearching;
  }, [isAllTasksLoading, isInitCompleted, isLocalDataLoaded, isSearching]);

  const onFilterChange = (filterId: string) => {
    setProjectFilter(filterId);
    LocalStorage.setItem("searchProjectFilter", filterId);
  };

  const renderTasks = useMemo(() => {
    if (!searchQuery) {
      return (
        sections?.map((section: Section) => {
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
        }) || []
      );
    }

    if (!searchTasks) {
      return [];
    }

    const filteredTasks =
      projectFilter === "all"
        ? searchTasks
        : searchTasks.filter((task) => {
            return task.projectId === projectFilter;
          });

    return filteredTasks.map((task) => (
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
        tags={task.tags}
        detailMarkdown={getTaskDetailMarkdownContent(task)}
        copyContent={getTaskCopyContent(task)}
        refresh={refresh}
      />
    ));
  }, [projectFilter, refresh, searchQuery, searchTasks, sections]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder="Search all tasks..."
      isShowingDetail
      searchBarAccessory={
        <SearchFilter value={projectFilter} filterSections={filterSections} onFilterChange={onFilterChange} />
      }
    >
      {renderTasks.length > 0 ? renderTasks : <List.EmptyView title="Type something to search tasks" />}
    </List>
  );
};

export default TickTickSearch;
