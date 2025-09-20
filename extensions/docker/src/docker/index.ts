import Dockerode, {
  ContainerInfo,
  ContainerInspectInfo,
  ImageInfo,
  ImageInspectInfo,
  ContainerCreateOptions,
} from '@priithaamer/dockerode';
import React, { useEffect, useRef, useState } from 'react';
import { ComposeProject, containersToProjects } from './compose';
import { isContainerRunning } from './container';

export type DockerState = ReturnType<typeof useDocker>;

const FetchInterval = 1000;

export const useDocker = (docker: Dockerode) => {
  const stopContainer = ({ Id }: { Id: string }) => docker.getContainer(Id).stop();

  const startContainer = ({ Id }: { Id: string }) => docker.getContainer(Id).start();

  const restartContainer = ({ Id }: { Id: string }) => docker.getContainer(Id).restart();

  const removeContainer = ({ Id }: { Id: string }) => docker.getContainer(Id).remove();

  const stopAndRemoveContainer = async ({ Id }: { Id: string }) => {
    await docker.getContainer(Id).stop();
    await docker.getContainer(Id).remove();
  };

  const useImages = () => {
    const [images, setImages] = useState<ImageInfo[]>();
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();
    const interval = useRef<NodeJS.Timeout>();

    useEffect(() => {
      async function fetchImages() {
        try {
          const images = await docker.listImages();
          setImages(images);
        } catch (error) {
          if (error instanceof Error) {
            setError(error);
          }
        }
      }

      withLoading(setLoading, fetchImages)();
      interval.current = setInterval(fetchImages, FetchInterval);

      return () => interval.current && clearInterval(interval.current);
    }, []);

    return {
      images,
      error,
      isLoading,
      removeImage: withLoading(setLoading, ({ Id }: { Id: string }) => docker.getImage(Id).remove()),
    };
  };

  const useImageInfo = ({ Id }: { Id: string }) => {
    const [imageInfo, setImageInfo] = useState<ImageInspectInfo>();
    const [isLoading, setLoading] = useState(false);
    const interval = useRef<NodeJS.Timeout>();

    useEffect(() => {
      async function fetchImageInfo() {
        const imageInfo = await docker.getImage(Id).inspect();
        setImageInfo(imageInfo);
      }

      withLoading(setLoading, fetchImageInfo)();
      interval.current = setInterval(fetchImageInfo, FetchInterval);

      return () => interval.current && clearInterval(interval.current);
    }, [Id]);

    return { imageInfo, isLoading };
  };

  const useContainers = () => {
    const [containers, setContainers] = useState<ContainerInfo[]>();
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();
    const interval = useRef<NodeJS.Timeout>();

    useEffect(() => {
      async function fetchContainers() {
        try {
          const containers = await docker.listContainers({ all: true });
          setContainers(containers);
        } catch (error) {
          if (error instanceof Error) {
            setError(error);
          }
        }
      }

      withLoading(setLoading, fetchContainers)();
      interval.current = setInterval(fetchContainers, FetchInterval);

      return () => interval.current && clearInterval(interval.current);
    }, []);

    return {
      containers,
      isLoading,
      error,
      startContainer: withLoading(setLoading, startContainer),
      stopContainer: withLoading(setLoading, stopContainer),
      restartContainer: withLoading(setLoading, restartContainer),
      removeContainer: withLoading(setLoading, removeContainer),
      stopAndRemoveContainer: withLoading(setLoading, stopAndRemoveContainer),
    };
  };

  const useContainerInfo = (containerId: string) => {
    const [containerInfo, setContainerInfo] = useState<ContainerInspectInfo>();
    const [isLoading, setLoading] = useState(false);
    const interval = useRef<NodeJS.Timeout>();

    useEffect(() => {
      async function fetchContainerInfo() {
        const response = await docker.getContainer(containerId).inspect();
        setContainerInfo(response);
      }

      withLoading(setLoading, fetchContainerInfo)();
      interval.current = setInterval(fetchContainerInfo, FetchInterval);

      return () => interval.current && clearInterval(interval.current);
    }, [containerId]);

    return {
      containerInfo,
      isLoading,
      startContainer: withLoading(setLoading, startContainer),
      restartContainer: withLoading(setLoading, restartContainer),
      stopContainer: withLoading(setLoading, stopContainer),
      removeContainer: withLoading(setLoading, removeContainer),
      stopAndRemoveContainer: withLoading(setLoading, stopAndRemoveContainer),
    };
  };

  const useProjects = () => {
    const [projects, setProjects] = useState<ComposeProject[]>();
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();
    const interval = useRef<NodeJS.Timeout>();

    useEffect(() => {
      async function fetchContainers() {
        try {
          const containers = await docker.listContainers({ all: true });
          setProjects(containersToProjects(containers));
        } catch (error) {
          if (error instanceof Error) {
            setError(error);
          }
        }
      }

      withLoading(setLoading, fetchContainers)();
      interval.current = setInterval(fetchContainers, FetchInterval);

      return () => interval.current && clearInterval(interval.current);
    }, []);

    return {
      projects,
      isLoading,
      error,
      startProject: withLoading(setLoading, async (project: ComposeProject) => {
        await Promise.all(
          project.containers
            .filter((container) => !isContainerRunning(container))
            .map((container) => docker.getContainer(container.Id).start()),
        );
        const containers = await docker.listContainers({ all: true });
        setProjects(containersToProjects(containers));
      }),
      stopProject: withLoading(setLoading, async (project: ComposeProject) => {
        await Promise.all(
          project.containers
            .filter((container) => isContainerRunning(container))
            .map((container) => docker.getContainer(container.Id).stop()),
        );
        const containers = await docker.listContainers({ all: true });
        setProjects(containersToProjects(containers));
      }),
    };
  };

  const useCreateContainer = () => {
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();

    const createContainer = async (options: ContainerCreateOptions) => {
      setLoading(true);
      try {
        const container = await docker.createContainer(options);
        await container.start();
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
        }
      } finally {
        setLoading(false);
      }
    };

    return { createContainer, isLoading, error };
  };

  return {
    useImages,
    useImageInfo,
    useContainers,
    useContainerInfo,
    useProjects,
    useCreateContainer,
  };
};

function withLoading<ReturnValue>(
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  callback: () => Promise<ReturnValue>,
): () => Promise<ReturnValue>;

function withLoading<Arguments, ReturnValue>(
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  callback: (args: Arguments) => Promise<ReturnValue>,
): (args: Arguments) => Promise<ReturnValue>;

function withLoading<Arguments, ReturnValue>(
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  callback: (args: Arguments) => Promise<ReturnValue>,
): (args: Arguments) => Promise<ReturnValue> {
  return async (args: Arguments) => {
    setLoading(true);
    try {
      const returnValue = await callback(args);
      setLoading(false);
      return returnValue;
    } finally {
      setLoading(false);
    }
  };
}
