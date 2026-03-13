import { Cache } from '@raycast/api';
import { CONSTANTS } from './constants';

import type { RamdaFunctionList } from '../../@types';

export const cache = new Cache();

export const getCachedItems = (): RamdaFunctionList | undefined => {
  const cachedItems = cache.get('items');

  if (cachedItems) {
    const { functionData, ttl } = JSON.parse(cachedItems);

    if (Date.now() < ttl) {
      return functionData;
    }
  }
};

export const setCachedItems = (functionData: RamdaFunctionList) => {
  cache.set('items', JSON.stringify({ functionData, ttl: Date.now() + CONSTANTS.DOCUMENTATION_TTL }));
};
