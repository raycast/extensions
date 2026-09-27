import { Alert, confirmAlert } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import { deleteHistoryById, deleteHistoryPurge, getHistory, putHistoryById } from '../api';
import type { HistoryFormValues, HistoryItem } from './types';

const historyPageSize = 25;

export function useHistory() {
  const {
    data: history,
    isLoading,
    pagination,
    revalidate,
  } = usePromise(
    () =>
      async ({ page }) => {
        const response = await getHistory({
          query: {
            page: page + 1,
            limit: historyPageSize,
          },
        });

        if (response.data === undefined) {
          throw new Error('History request failed');
        }

        return {
          data: response.data.data,
          hasMore: response.data.pagination.page < response.data.pagination.totalPages,
        };
      },
    [],
  );

  const updateHistory = async (id: number, values: HistoryFormValues) => {
    const response = await putHistoryById({
      body: {
        word: values.word.trim(),
        result: values.result.trim() || null,
      },
      path: { id: String(id) },
    });

    if (response.data === undefined) {
      throw new Error('History update failed');
    }

    await revalidate();
  };

  const deleteHistory = async (item: HistoryItem) => {
    const confirmed = await confirmAlert({
      title: 'Delete history entry?',
      message: `Remove "${item.word}" from the search history?`,
      primaryAction: {
        title: 'Delete',
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const response = await deleteHistoryById({ path: { id: String(item.id) } });

    if (response.error !== undefined) {
      throw new Error('History deletion failed');
    }

    await revalidate();
  };

  const purgeHistory = async () => {
    const confirmed = await confirmAlert({
      title: 'Delete all history?',
      message: 'All search history entries will be permanently removed.',
      primaryAction: {
        title: 'Delete All',
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const response = await deleteHistoryPurge();

    if (response.error !== undefined) {
      throw new Error('History purge failed');
    }

    await revalidate();
  };

  return {
    history,
    isLoading,
    pagination,
    updateHistory,
    deleteHistory,
    purgeHistory,
  };
}
