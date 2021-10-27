import { ContainerInfo, ContainerInspectInfo } from '@priithaamer/dockerode';
import * as markdown from '../utils/markdown';

export const isContainerRunning = (containerInfo: ContainerInfo) => containerInfo.State === 'running';

export const containerName = (container: ContainerInfo) =>
  container.Names.map((name) => name.replace(/^\//, '')).join(', ');

export const containerInspectName = (container: ContainerInspectInfo) => container.Name.replace(/^\//, '');

export const formatContainerDetailMarkdown = (container: ContainerInspectInfo | undefined) =>
  container !== undefined
    ? `## ${containerInspectName(container)}` +
      '\n\n' +
      markdown.attributes([
        ['Image', container.Config.Image],
        ['Status', container.State.Status],
        ['Command', '`' + container.Config.Cmd?.join(' ') + '`'],
      ]) +
      renderEnvSection(container.Config.Env) +
      `\n`
    : '';

const renderEnvSection = (env: string[]) => {
  if (env.length === 0) {
    return '';
  }

  return [`\n\n## Environment`, markdown.codeBlock(env.join('\n'))].join('\n');
};
