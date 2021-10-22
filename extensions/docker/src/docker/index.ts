import Dockerode, { ContainerInfo, ContainerInspectInfo, ImageInfo, ImageInspectInfo } from '@priithaamer/dockerode';
import { useEffect, useState } from 'react';
import { ComposeProject, containersToProjects } from './compose';
import { isContainerRunning } from './container';

export type DockerState = ReturnType<typeof useDocker>;

export const useDocker = (docker: Dockerode) => {
  const [containers, setContainers] = useState<ContainerInfo[]>();
  const [isLoading, setLoading] = useState(false);

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

  const useImages = () => {
    const [images, setImages] = useState<ImageInfo[]>();
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();

    useEffect(() => {
      async function fetchImages() {
        setLoading(true);
        try {
          const images = await docker.listImages();
          setImages(images);
        } catch (error) {
          if (error instanceof Error) {
            setError(error);
          }
        } finally {
          setLoading(false);
        }
      }
      fetchImages();
    }, []);

    return {
      images,
      error,
      isLoading,
      removeImage: async ({ Id }: { Id: string }) => {
        setLoading(true);
        await docker.getImage(Id).remove();
        const images = await docker.listImages();
        setImages(images);
        setLoading(false);
      },
    };
  };

  const useImageInfo = ({ Id }: { Id: string }) => {
    const [imageInfo, setImageInfo] = useState<ImageInspectInfo>();
    const [isLoading, setLoading] = useState(false);

    useEffect(() => {
      async function fetchImageInfo() {
        setLoading(true);
        const imageInfo = await docker.getImage(Id).inspect();
        setImageInfo(imageInfo);
        setLoading(false);
      }
      fetchImageInfo();
    }, [Id]);

    return { imageInfo, isLoading };
  };

  const useContainers = () => {
    const [error, setError] = useState<Error>();

    useEffect(() => {
      async function fetchContainers() {
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
      }
      fetchContainers();
    }, []);

    return { containers, isLoading, error, stopContainer, startContainer, restartContainer, removeContainer };
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
      fetchContainerInfo();
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

  const useProjects = () => {
    const [projects, setProjects] = useState<ComposeProject[]>();
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();

    useEffect(() => {
      async function fetchContainers() {
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
      }
      fetchContainers();
    }, []);

    return {
      projects,
      isLoading,
      error,
      startProject: async (project: ComposeProject) => {
        setLoading(true);
        await Promise.all(
          project.containers
            .filter((container) => !isContainerRunning(container))
            .map((container) => docker.getContainer(container.Id).start())
        );
        const containers = await docker.listContainers({ all: true });
        setProjects(containersToProjects(containers));
        setLoading(false);
      },
      stopProject: async (project: ComposeProject) => {
        setLoading(true);
        await Promise.all(
          project.containers
            .filter((container) => isContainerRunning(container))
            .map((container) => docker.getContainer(container.Id).stop())
        );
        const containers = await docker.listContainers({ all: true });
        setProjects(containersToProjects(containers));
        setLoading(false);
      },
    };
  };

  return {
    useImages,
    useImageInfo,
    useContainers,
    useContainerInfo,
    useProjects,
  };
};
