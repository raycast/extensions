import { ContainerInfo, ContainerInspectInfo } from '@priithaamer/dockerode';
import * as markdown from '../utils/markdown';

export const isContainerRunning = (containerInfo: ContainerInfo) => containerInfo.State === 'running';

export const containerName = ({ Names, Name }: { Names?: string[]; Name?: string }) => {
  if (Names !== undefined) {
    return Names.map((name) => name.replace(/^\//, '')).join(', ');
  }
  if (Name !== undefined) {
    return Name.replace(/^\//, '');
  }
  return '-';
};

export const formatContainerDetailMarkdown = (container: ContainerInspectInfo | undefined) =>
  container !== undefined
    ? `# ${containerName(container)}` + '\n\n' + renderEnvSection(container.Config.Env) + `\n`
    : '';

const renderEnvSection = (env: string[]) => {
  if (env.length === 0) {
    return '';
  }

  return [`\n\n## Environment`, markdown.codeBlock(env.join('\n'))].join('\n');
};
