import { Detail } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useEffect, useMemo } from 'react';
import useTurndown from './hooks/useTurndown';
import statisticActions from './api/statisticActions';
import useErrorHandling from './hooks/useErrorHandling';

export default function ViewStats() {
  const { data, isLoading, error } = useCachedPromise(statisticActions.getCollectionStatsHTML);
  const { turndown } = useTurndown();
  const { handleError, errorMarkdown } = useErrorHandling();

  useEffect(() => {
    if (!error) return;
    handleError(error);
  }, [error]);

  const markdownStats = useMemo(() => {
    if (!turndown) return;
    if (isLoading || error || !data) return;
    return turndown.turndown(data);
  }, [turndown, data, isLoading, error]);

  return <Detail isLoading={isLoading} markdown={error ? errorMarkdown : markdownStats} />;
}
