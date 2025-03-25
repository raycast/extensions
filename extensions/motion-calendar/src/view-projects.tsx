import { List, ActionPanel, Action, showToast, Toast } from '@raycast/api';
import { useState, useEffect } from 'react';
import { motionAPI } from './api';

interface Project {
  id: string;
  name: string;
  description?: string;
  deadline?: string;
  status: {
    name: string;
    type: string;
  };
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
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
    async function fetchProjects() {
      if (!selectedWorkspace) return;

      try {
        setIsLoading(true);
        const projects = await motionAPI.getProjects(selectedWorkspace);
        setProjects(projects);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to fetch projects',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, [selectedWorkspace]);

  return (
    <List isLoading={isLoading}>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.description}
          accessories={[
            { text: project.status.name },
            project.deadline ? { date: new Date(project.deadline) } : null,
          ].filter(Boolean)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Motion"
                url={`https://app.usemotion.com/projects/${project.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
