import { Detail, showToast, Toast } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useEffect, useMemo } from 'react';
import useTurndown from './hooks/useTurndown';
import statisticActions from './api/statisticActions';
import { AnkiError } from './error/AnkiError';

export default function ViewStats() {
  const { data, isLoading, error } = useCachedPromise(statisticActions.getCollectionStatsHTML);
  const { turndown } = useTurndown();

  useEffect(() => {
    if (error) {
      const isAnkiError = error instanceof AnkiError;
      showToast({
        title: isAnkiError ? 'Anki Error' : 'Error',
        message: isAnkiError ? error.message : 'Unknown error occured',
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  const markdownStats = useMemo(() => {
    if (!turndown) return;
    if (isLoading || error || !data) return;
    return turndown.turndown(data);
  }, [turndown, data, isLoading, error]);

  return <Detail isLoading={isLoading} markdown={markdownStats} />;
}
