import { List, ActionPanel, Action, showToast, Toast } from '@raycast/api';
import { useState, useEffect } from 'react';
import { motionAPI } from './api';

interface Task {
  id: string;
  name: string;
  description?: string;
  deadline?: string;
  status: {
    name: string;
    type: string;
  };
  priority?: {
    name: string;
    type: string;
  };
}

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
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
    async function fetchTasks() {
      if (!selectedWorkspace) return;

      try {
        setIsLoading(true);
        const tasks = await motionAPI.getTasks(selectedWorkspace);
        setTasks(tasks);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to fetch tasks',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, [selectedWorkspace]);

  return (
    <List isLoading={isLoading}>
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.name}
          subtitle={task.description}
          accessories={[
            task.priority ? { text: task.priority.name } : null,
            { text: task.status.name },
            task.deadline ? { date: new Date(task.deadline) } : null,
          ].filter(Boolean)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Motion"
                url={`https://app.usemotion.com/tasks/${task.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
