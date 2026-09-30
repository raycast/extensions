import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { parse } from 'node-html-parser';
import { getCachedItems, reduceRamdaHTMLFunctionCards, setCachedItems } from '../utils';
import { CONSTANTS } from '../utils/constants';

import type { RamdaFunctionList } from '../../@types';

type UseRamdaDocumentation = {
  isLoading: boolean;
  data: RamdaFunctionList;
};

export const useRamdaDocumentation = (): UseRamdaDocumentation => {
  const { isLoading, data } = useFetch<string>(CONSTANTS.RAMDA_URL);

  const ramdaFunctions = useMemo(() => {
    const cachedRamdaDocumentation = getCachedItems();

    if (cachedRamdaDocumentation) {
      return cachedRamdaDocumentation;
    } else if (!data) {
      return;
    }

    const ramdaPage = parse(data);
    const functionData = reduceRamdaHTMLFunctionCards(ramdaPage);

    setCachedItems(functionData);

    return functionData;
  }, [data]);

  return {
    isLoading: isLoading && !ramdaFunctions,
    data: ramdaFunctions,
  };
};
