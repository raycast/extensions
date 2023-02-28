import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { parse } from 'node-html-parser';
import { getCachedItems, reduceRambdaHTMLFunctionCards, setCachedItems } from '../utils';
import { CONSTANTS } from '../utils/constants';

import type { RambdaFunctionList } from '../../@types';

type UseRambdaDocumentation = {
  isLoading: boolean;
  data: RambdaFunctionList;
};

export const useRambdaDocumentation = (): UseRambdaDocumentation => {
  const { isLoading, data } = useFetch<string>(CONSTANTS.RAMBDA_URL);

  const rambdaFunctions = useMemo(() => {
    const cachedRamdaDocumentation = getCachedItems();

    if (cachedRamdaDocumentation) {
      return cachedRamdaDocumentation;
    } else if (!data) {
      return;
    }

    const rambdaPage = parse(data);
    const functionData = reduceRambdaHTMLFunctionCards(rambdaPage);

    setCachedItems(functionData);

    return functionData;
  }, [data]);

  return {
    isLoading: isLoading && !rambdaFunctions,
    data: rambdaFunctions,
  };
};
