import type { Color } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { NODE_VERSIONS_URL } from '../../config';
import { getColorTag } from '../../helpers';
import type { NodeVersionElement } from '../../types';
import { isNodeVersionsResponseValid } from './validators';

export function createNodeVersionElement(
  { version, lts, date }: NodeVersionElement,
  index: number,
  elements: NodeVersionElement[],
) {
  const currentTag =
    index === 0
      ? {
          label: 'Current',
          value: 'current',
          color: getColorTag('current'),
        }
      : null;

  const latestTag =
    elements[index - 1]?.version.split('.').at(0) !== version.split('.').at(0)
      ? {
          label: 'Latest',
          value: 'latest',
          color: getColorTag('latest'),
        }
      : null;

  const ltsTag = lts
    ? {
        label: `LTS: ${lts}`,
        value: 'lts',
        color: getColorTag('lts'),
      }
    : null;

  const tagList = [currentTag, ltsTag, latestTag].filter(
    (tag): tag is { label: string; value: string; color: Color } => tag !== null,
  );

  return {
    version,
    lts,
    date,
    tagList,
  };
}

async function parseNodeVersionsResponse(response: Response) {
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = await response.json();

  if (!isNodeVersionsResponseValid(data)) {
    throw new Error('Invalid Node.js versions response data');
  }

  return data.map(createNodeVersionElement);
}

export function useFetchNodeVersions() {
  return useFetch(NODE_VERSIONS_URL, {
    parseResponse: parseNodeVersionsResponse,
    keepPreviousData: true,
  });
}
