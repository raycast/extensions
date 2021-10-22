import Dockerode, { ContainerInfo } from '@priithaamer/dockerode';
import { ActionPanel, Color, Icon, List, PushAction, showToast, ToastStyle } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import ContainerList from './container_list';
import { isContainerRunning } from './docker/container';
import ErrorDetail from './error_detail';

type ComposeProject = {
  name: string;
  configFiles: string;
  workingDir: string;
  containers: ContainerInfo[];
};

const containersToProjects = (containers: ContainerInfo[]): ComposeProject[] => {
  return containers.reduce((memo, containerInfo) => {
    const projectName = containerInfo.Labels['com.docker.compose.project'];
    const configFiles = containerInfo.Labels['com.docker.compose.config_files'];
    const workingDir = containerInfo.Labels['com.docker.compose.working_dir'];
    if (projectName === undefined) {
      return memo;
    }

    const project = memo.find(({ name }) => name === projectName);
    if (project !== undefined) {
      project.containers = [...project.containers, containerInfo];
      return memo;
    } else {
      return [...memo, { name: projectName, configFiles, workingDir, containers: [containerInfo] }];
    }
  }, [] as ComposeProject[]);
};

const useDocker = (docker: Dockerode) => {
  const [projects, setProjects] = useState<ComposeProject[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const containers = await docker.listContainers({ all: true });
      setProjects(containersToProjects(containers));
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const stopProject = async (project: ComposeProject) => {
    setLoading(true);
    await Promise.all(
      project.containers
        .filter((container) => isContainerRunning(container))
        .map((container) => docker.getContainer(container.Id).stop())
    );
    const containers = await docker.listContainers({ all: true });
    setProjects(containersToProjects(containers));
    setLoading(false);
  };

  const startProject = async (project: ComposeProject) => {
    setLoading(true);
    await Promise.all(
      project.containers
        .filter((container) => !isContainerRunning(container))
        .map((container) => docker.getContainer(container.Id).start())
    );
    const containers = await docker.listContainers({ all: true });
    setProjects(containersToProjects(containers));
    setLoading(false);
  };

  useEffect(() => {
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { projects, loading, error, startProject, stopProject };
};

export default function ProjectsList() {
  const docker = useMemo(() => new Dockerode(), []);
  const { projects, loading, error, startProject, stopProject } = useDocker(docker);

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List isLoading={loading}>
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
