import { ImageInfo, ImageInspectInfo } from '@priithaamer/dockerode';
import * as markdown from '../utils/markdown';

export const imageTitle = (image: ImageInfo | ImageInspectInfo) =>
  (image.RepoTags ?? image.RepoDigests ?? image.Id).join(' ');

export const formatImageId = (imageId: string, length?: number) => {
  const result = imageId.replace('sha256:', '');
  if (length !== undefined) {
    return result.slice(0, length);
  }
  return result;
};

export const formatImageDetailMarkdown = (image: ImageInspectInfo | undefined) =>
  image !== undefined
    ? `## ${imageTitle(image)}` +
      markdown.attributes([
        ['ID', formatImageId(image.Id, 12)],
        ['Size', formatBytes(image.Size)],
        ['OS', image.Os],
        ['Architecture', image.Architecture],
        ['Command', markdown.inlineCode(formatImageCommand(image.Config.Cmd ?? []))],
        ['Entrypoint', markdown.inlineCode(formatEntryPoint(image.Config.Entrypoint))],
      ]) +
      renderEnvSection(image.Config.Env ?? []) +
      `\n`
    : '';

const renderEnvSection = (env: string[]) => {
  if (env.length === 0) {
    return '';
  }

  return [`\n\n## Environment`, markdown.codeBlock(env.join('\n'))].join('\n');
};

const formatImageCommand = (cmd: string[]) => cmd.join(' ');

const formatEntryPoint = (entrypoint: string | string[] | undefined | null) => {
  if (entrypoint === undefined || entrypoint === null) {
    return '-';
  } else if (Array.isArray(entrypoint)) {
    return entrypoint.join(' ');
  } else {
    return entrypoint;
  }
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
