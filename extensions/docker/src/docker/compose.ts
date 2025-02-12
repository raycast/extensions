import { ContainerInfo } from '@priithaamer/dockerode';

export type ComposeProject = {
  name: string;
  configFiles: string;
  workingDir: string;
  containers: ContainerInfo[];
};

export const containersToProjects = (containers: ContainerInfo[]): ComposeProject[] => {
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
