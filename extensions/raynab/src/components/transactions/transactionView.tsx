import { useEffect, useReducer, useRef } from 'react';
import { List, showToast, Toast } from '@raycast/api';

import { useSharedState } from 'hooks/useSharedState';
import { TransactionItem } from './transactionItem';
import { initView, transactionViewReducer } from './viewReducer';
import { TransactionProvider } from './transactionContext';
import { type Period } from '@srcTypes';
import { useTransactions } from '@hooks/useTransactions';
import { useLocalStorage } from '@hooks/useLocalStorage';

export function TransactionView() {
  const [activeBudgetId] = useLocalStorage('activeBudgetId', '');
  const [timeline, setTimeline] = useSharedState<Period>('timeline', 'month');
  const { data: transactions = [], isValidating } = useTransactions(activeBudgetId, timeline ?? 'month');

  const [state, dispatch] = useReducer(
    transactionViewReducer,
    {
      filter: null,
      group: null,
      sort: 'date_desc', // Default to newest transactions first
      search: '',
      collection: transactions,
      initialCollection: transactions,
    },
    initView
  );

  const { collection, group, sort, filter, search: query } = state;

  // Prevents success toast from overriding a failure
  const errorToastPromise = useRef<Promise<Toast> | null>(null);
  useEffect(() => {
    // Showing an empty list will prevent users from accessing actions and will be stuck
    // We progressively back off in order to not fetch unnecessary data
    // This might cause problems for budgets with no transactions in the past year
    // TODO add a view for > 1 year, change to a different fallback model?

    if (transactions.length == 0) {
      let fallbackTimeline: Period;
      switch (timeline) {
        case 'day':
          fallbackTimeline = 'week';
          break;
        case 'week':
          fallbackTimeline = 'month';
          break;
        case 'month':
          fallbackTimeline = 'quarter';
          break;
        default:
          fallbackTimeline = 'year';
          break;
      }

      setTimeline(fallbackTimeline);
      errorToastPromise.current = showToast({
        style: Toast.Style.Failure,
        title: `No results for the past ${timeline}`,
        message: `Falling back to the last ${fallbackTimeline}`,
      });
      return;
    }

    dispatch({ type: 'reset', initialCollection: transactions });

    // Keep the current query in sync with the new collection to filter
    dispatch({ type: 'search', query });

    // Prevents success toast from overriding a failure
    if (errorToastPromise.current) {
      errorToastPromise.current.then((t) => setTimeout(() => t.hide(), 1500));
      errorToastPromise.current = null;
    } else {
      showToast({ style: Toast.Style.Success, title: `Showing transactions for the past ${timeline}` });
    }
  }, [timeline, transactions]);

  return (
    <TransactionProvider dispatch={dispatch} state={{ group, sort, filter, timeline }} onTimelineChange={setTimeline}>
      <List
        isLoading={isValidating}
        searchBarPlaceholder={`Search transactions in the last ${timeline}`}
        onSearchTextChange={(query) => dispatch({ type: 'search', query })}
      >
        {!Array.isArray(collection)
          ? Array.from(collection).map(([, group]) => (
              <List.Section
                title={group.title}
                key={group.id}
                children={group.items.map((t) => (
                  <TransactionItem transaction={t} key={t.id} />
                ))}
              />
            ))
          : collection.map((t) => <TransactionItem transaction={t} key={t.id} />)}
      </List>
    </TransactionProvider>
  );
}
