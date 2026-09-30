import { Color } from '@raycast/api';

export const NODE_BASE_URL = 'https://nodejs.org';
export const NODE_RELEASES_GITHUB_BASE_URL = 'https://api.github.com/repos/nodejs/node/releases';
export const NODE_VERSIONS_URL = `${NODE_BASE_URL}/dist/index.json`;

export const FILTERS = [
  {
    title: 'Latest',
    value: 'latest',
  },
  {
    title: 'LTS',
    value: 'lts',
  },
  {
    title: 'All',
    value: '',
  },
] as const;

export const COLOR_TAGS = {
  lts: Color.Blue,
  current: Color.Yellow,
  latest: Color.Green,
};
