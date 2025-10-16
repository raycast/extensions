import config from 'parse-git-config';
import memoize from 'lodash/memoize';

export const getGitConfig = memoize((path: string) => {
  return config.sync({ cwd: path, path: '.git/config', expandKeys: true });
});

export const isGitRepo = (path: string): boolean => {
  const config = getGitConfig(path);
  return !!config.core;
};

export function getGitRemoteUrl(path: string): string {
  const config = getGitConfig(path);
  const url = config?.remote?.origin?.url;
  return url;
}

export function parseGitRemoteURL(path: string): string {
  const remoteURL = getGitRemoteUrl(path);

  let tempPath = remoteURL
    // remove `.git` at the end of the url
    .replace(/\.git$/, '')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/^git@/, 'https://')
    // remove port number
    .replace(/(?=\S+):\d+\//, '/')
    .replaceAll(/(?<!https+):/g, '/');

  // a special treatment for `stash` link
  const isStashLink = tempPath.includes('https://stash');
  if (isStashLink) {
    const strs = tempPath.replace('https://', '').split('/');
    tempPath = `https://${strs[0]}/projects/${strs[1]}/repos/${strs[2]}/browse`;
  }

  return tempPath;
}
