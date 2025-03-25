import { List, ActionPanel, Action, showToast, Toast } from '@raycast/api';
import { useState, useEffect } from 'react';
import { motionAPI } from './api';

interface ScheduleItem {
  id: string;
  name: string;
  type: 'task' | 'project';
  deadline?: string;
  status: {
    name: string;
    type: string;
  };
}

export default function Command() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>();

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const workspaces = await motionAPI.getWorkspaces();
        if (workspaces.length > 0) {
          setSelectedWorkspace(workspaces[0].id);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to fetch workspaces',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    async function fetchSchedule() {
      if (!selectedWorkspace) return;

      try {
        setIsLoading(true);
        const schedule = await motionAPI.getSchedule(selectedWorkspace);

        const scheduleItems: ScheduleItem[] = [
          ...schedule.tasks.map((task) => ({
            id: task.id,
            name: task.name,
            type: 'task' as const,
            deadline: task.deadline,
            status: task.status,
          })),
          ...schedule.projects.map((project) => ({
            id: project.id,
            name: project.name,
            type: 'project' as const,
            deadline: project.deadline,
            status: project.status,
          })),
        ].sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });

        setItems(scheduleItems);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to fetch schedule',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchedule();
  }, [selectedWorkspace]);

  return (
    <List isLoading={isLoading}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={item.type}
          accessories={[
            { text: item.status.name },
            item.deadline ? { date: new Date(item.deadline) } : null,
          ].filter(Boolean)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Motion"
                url={`https://app.usemotion.com/${item.type}s/${item.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
