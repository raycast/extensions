import Dockerode from '@priithaamer/dockerode';
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useMemo } from 'react';
import ContainerList from './container_list';
import { useDocker } from './docker';
import { ComposeProject } from './docker/compose';
import { isContainerRunning } from './docker/container';
import ErrorDetail from './error_detail';
import { withToast } from './ui/toast';

export default function ProjectsList() {
  const docker = useMemo(() => new Dockerode(), []);
  const { useProjects } = useDocker(docker);
  const { projects, isLoading, error, startProject, stopProject } = useProjects();

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List isLoading={isLoading}>
      {projects?.map((project) => (
        <List.Item
          key={project.name}
          icon={{ source: 'icon-compose.png', tintColor: Color.SecondaryText }}
          title={project.name}
          subtitle={projectSubTitle(project)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Containers"
                icon={{ source: Icon.Binoculars }}
                target={<ContainerList projectFilter={project.name} />}
              />
              <Action
                title="Start All Containers"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
                icon={{ source: 'icon-startall.png', tintColor: Color.PrimaryText }}
                onAction={withToast({
                  action: () => startProject(project),
                  onSuccess: () => `Started ${project.name}`,
                  onFailure: ({ message }) => message,
                })}
              />
              <Action
                title="Stop All Containers"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'w' }}
                icon={{ source: 'icon-stopall.png', tintColor: Color.PrimaryText }}
                onAction={withToast({
                  action: () => stopProject(project),
                  onSuccess: () => `Stopped ${project.name}`,
                  onFailure: ({ message }) => message,
                })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const projectSubTitle = ({ containers }: ComposeProject) => {
  const runningCount = containers.reduce((memo, item) => (memo += isContainerRunning(item) ? 1 : 0), 0);
  const stoppedCount = containers.length - runningCount;
  return `${runningCount} Running, ${stoppedCount} Stopped`;
};
