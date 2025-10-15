import { List } from "@raycast/api";
import { useMemo, useCallback } from "react";
import { ProjectType } from "../types";
import { useProjects, useTimers } from "../hooks";
import { TimerItem } from "../components/TimerItem";
import { ProjectItem } from "../components/ProjectItem";

interface TimersViewProps {
  onNavigateToAddEntry: () => void;
  onNavigateToEntries: () => void;
  onNavigateToLogTimer: (project: ProjectType) => void;
}

export const TimersView = ({
  onNavigateToAddEntry,
  onNavigateToEntries,
  onNavigateToLogTimer,
}: TimersViewProps) => {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  const {
    data: timers = [],
    isLoading: timersLoading,
    mutate: refreshTimers,
  } = useTimers();

  const isLoading = projectsLoading || timersLoading;

  // Get projects that don't have timers
  const projectsWithoutTimers = useMemo(() => {
    const projectIdsWithTimers = new Set(
      timers.map((timer) => timer.project.id),
    );
    return projects.filter((project) => !projectIdsWithTimers.has(project.id));
  }, [projects, timers]);

  const handleTimerChange = useCallback(() => {
    refreshTimers();
  }, [refreshTimers]);

  const handleLogTimer = useCallback(
    (project: ProjectType) => {
      onNavigateToLogTimer(project);
    },
    [onNavigateToLogTimer],
  );

  if (isLoading) {
    return <List isLoading={true} />;
  }

  return (
    <List isLoading={isLoading}>
      {timers.map((timer) => (
        <TimerItem
          key={`timer-${timer.id}`}
          timer={timer}
          onAddEntry={onNavigateToAddEntry}
          onViewEntries={onNavigateToEntries}
          onLogTimer={handleLogTimer}
          onTimerChange={handleTimerChange}
        />
      ))}

      {projectsWithoutTimers.map((project) => (
        <ProjectItem
          key={`project-${project.id}`}
          project={project}
          onAddEntry={onNavigateToAddEntry}
          onViewEntries={onNavigateToEntries}
          onTimerChange={handleTimerChange}
        />
      ))}
    </List>
  );
};
