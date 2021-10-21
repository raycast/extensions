import Dockerode, { ContainerInfo, ContainerInspectInfo } from '@priithaamer/dockerode';
import { useEffect, useState } from 'react';

export type DockerState = ReturnType<typeof useDocker>;

export const useDocker = (docker: Dockerode) => {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const containers = await docker.listContainers({ all: true });
      setContainers(containers);
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const stopContainer = async (containerInfo: { Id: string }) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).stop();
    const containers = await docker.listContainers({ all: true });
    setContainers(containers);
    setLoading(false);
  };

  const startContainer = async (containerInfo: { Id: string }) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).start();
    const containers = await docker.listContainers({ all: true });
    setContainers(containers);
    setLoading(false);
  };

  const restartContainer = async (containerInfo: { Id: string }) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).restart();
    const containers = await docker.listContainers({ all: true });
    setContainers(containers);
    setLoading(false);
  };

  const removeContainer = async (containerInfo: { Id: string }) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).remove();
    const containers = await docker.listContainers({ all: true });
    setContainers(containers);
    setLoading(false);
  };

  const useContainers = () => {
    useEffect(() => {
      console.log('--- Fetch containers');
      fetchContainers();

      return () => {
        console.log('--- Stop fetch containers');
      };
    }, []);

    return { containers, isLoading: loading };
  };

  const useContainerInfo = (containerId: string) => {
    const [containerInfo, setContainerInfo] = useState<ContainerInspectInfo>();
    const [isLoading, setLoading] = useState(false);

    useEffect(() => {
      async function fetchContainerInfo() {
        setLoading(true);
        const response = await docker.getContainer(containerId).inspect();
        setContainerInfo(response);
        setLoading(false);
      }
      console.log('-- Fetch container info');

      fetchContainerInfo();

      return () => {
        console.log('-- Stop container info');
      };
    }, [containerId]);

    return {
      containerInfo,
      isLoading,
      startContainer,
      restartContainer,
      stopContainer,
      removeContainer,
    };
  };

  return {
    error,
    stopContainer,
    startContainer,
    restartContainer,
    removeContainer,
    useContainers,
    useContainerInfo,
  };
};
