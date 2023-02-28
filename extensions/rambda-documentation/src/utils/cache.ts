import { Cache } from '@raycast/api';

import type { RambdaFunctionList } from '../../@types';
import { CONSTANTS } from './constants';

export const cache = new Cache();

export const getCachedItems = (): RambdaFunctionList | undefined => {
  const cachedItems = cache.get('items');

  if (cachedItems) {
    const { functionData, ttl } = JSON.parse(cachedItems);

    if (Date.now() < ttl) {
      return functionData;
    }
  }
};

export const setCachedItems = (functionData: RambdaFunctionList) => {
  cache.set('items', JSON.stringify({ functionData, ttl: Date.now() + CONSTANTS.DOCUMENTATION_TTL }));
};
