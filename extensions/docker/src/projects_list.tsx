import Dockerode from '@priithaamer/dockerode';
import { ActionPanel, Color, Icon, List, PushAction, showToast, ToastStyle } from '@raycast/api';
import { useMemo } from 'react';
import ContainerList from './container_list';
import { useDocker } from './docker';
import { ComposeProject } from './docker/compose';
import { isContainerRunning } from './docker/container';
import ErrorDetail from './error_detail';

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
          icon={{ source: Icon.List }}
          title={project.name}
          subtitle={projectSubTitle(project)}
          actions={
            <ActionPanel>
              <PushAction
                title="Show Containers"
                icon={{ source: Icon.Binoculars }}
                target={<ContainerList projectFilter={project.name} />}
              />
              <ActionPanel.Item
                title="Start All Containers"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
                icon={{ source: 'icon-startall.png', tintColor: Color.PrimaryText }}
                onAction={async () => {
                  await startProject(project);
                  await showToast(ToastStyle.Success, `Started ${project.name}`);
                }}
              />
              <ActionPanel.Item
                title="Stop All Containers"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'w' }}
                icon={{ source: 'icon-stopall.png', tintColor: Color.PrimaryText }}
                onAction={async () => {
                  await stopProject(project);
                  await showToast(ToastStyle.Success, `Stopped ${project.name}`);
                }}
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
