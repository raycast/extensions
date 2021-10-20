import { ContainerInfo } from '@priithaamer/dockerode';

export const isContainerRunning = (containerInfo: ContainerInfo) => containerInfo.State === 'running';
