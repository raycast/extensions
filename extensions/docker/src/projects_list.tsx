import { ActionPanel, Color, Icon, List, PushAction } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import Dockerode, { ContainerInfo } from '@priithaamer/dockerode';
import ContainerList from './container_list';

type ComposeProject = {
  name: string;
  configFiles: string;
  workingDir: string;
};

const containersToProjects = (containers: ContainerInfo[]): ComposeProject[] => {
  return containers.reduce((memo, containerInfo) => {
    const projectName = containerInfo.Labels['com.docker.compose.project'];
    const configFiles = containerInfo.Labels['com.docker.compose.config_files'];
    const workingDir = containerInfo.Labels['com.docker.compose.working_dir'];
    if (projectName === undefined) {
      return memo;
    }

    if (memo.find(({ name }) => name === projectName)) {
      return memo;
    }

    return [...memo, { name: projectName, configFiles, workingDir }];
  }, [] as ComposeProject[]);
};

const useDocker = (docker: Dockerode) => {
  const [projects, setProjects] = useState<ComposeProject[]>([]);
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

  useEffect(() => {
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { projects, loading, error };
};

export default function ProjectsList() {
  const docker = useMemo(() => new Dockerode(), []);
  const { projects, loading } = useDocker(docker);

  return (
    <List isLoading={loading}>
      {projects.map((project) => (
        <List.Item
          id={project.name}
          title={project.name}
          icon={{ source: Icon.List, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <PushAction title="Show Containers" target={<ContainerList projectFilter={project.name} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
