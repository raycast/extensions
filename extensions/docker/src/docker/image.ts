import { ImageInfo, ImageInspectInfo } from '@priithaamer/dockerode';

export const imageTitle = (image: ImageInfo | ImageInspectInfo) => image.RepoTags.join(' ');

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
      `\n\n**ID:** ${formatImageId(image.Id, 12)}` +
      `\n\n**Size:** ${formatBytes(image.Size)}` +
      `\n\n**OS:** ${image.Os}` +
      `\n\n**Architecture:** ${[image.Architecture]}` +
      `\n\n**Command:** ${formatImageCommand(image.Config.Cmd)}` +
      `\n\n**Entrypoint:** ${formatEntryPoint(image.Config.Entrypoint)}` +
      (image.Config.Env.length > 0 ? `\n\n## Environment\n\n` : '') +
      image.Config.Env.join('\n\n') +
      `\n`
    : '';

export const formatImageCommand = (cmd: string[]) => cmd.join(' ');

export const formatEntryPoint = (entrypoint: string | string[] | undefined | null) => {
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
