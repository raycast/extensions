import { ContainerInfo, ContainerInspectInfo } from '@priithaamer/dockerode';
import { containerName } from './container';

export interface ErrorECONNREFUSED extends Error {
  errno: -61;
  code: 'ECONNREFUSED';
  syscall: string;
  address: string;
}

export const isConnrefusedError = (error: Error & { errno?: number; code?: string }): error is ErrorECONNREFUSED => {
  return error.errno === -61 && error.code === 'ECONNREFUSED';
};

export const formatContainerError = (
  error: Error,
  containerInfo: ContainerInfo | ContainerInspectInfo,
): string | [string, string?] => {
  if (error.message.includes('container already stopped')) {
    return `Container ${containerName(containerInfo)} already stopped`;
  }

  if (error.message.includes('container already started')) {
    return `Container ${containerName(containerInfo)} already started`;
  }

  if (error.message.includes('cannot remove a running container')) {
    return [`Cannot remove running container`, `Please stop ${containerName(containerInfo)} first`];
  }

  return error.message;
};
