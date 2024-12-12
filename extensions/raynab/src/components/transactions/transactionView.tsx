import { useEffect, useReducer, useRef, useState } from 'react';
import { List, showToast, Toast } from '@raycast/api';

import { TransactionItem } from './transactionItem';
import { initView, transactionViewReducer } from './viewReducer';
import { TransactionProvider } from './transactionContext';
import { CurrencyFormat, Filter, type Period } from '@srcTypes';
import { useTransactions } from '@hooks/useTransactions';
import { formatToReadablePrice } from '@lib/utils';
import { useLocalStorage } from '@raycast/utils';

interface TransactionViewProps {
  search?: string;
  filter?: Filter;
}

export function TransactionView({ search = '', filter: defaultFilter = null }: TransactionViewProps) {
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const { value: activeBudgetId, isLoading: isLoadingBudget } = useLocalStorage('activeBudgetId', '');
  const [timeline, setTimeline] = useState<Period>('month');
  const { data: transactions = [], isLoading, isValidating } = useTransactions(activeBudgetId, timeline);

  const [state, dispatch] = useReducer(
    transactionViewReducer,
    {
      filter: defaultFilter,
      group: null,
      sort: 'date_desc', // Default to newest transactions first
      search: search,
      collection: transactions,
      isShowingDetails: false,
      initialCollection: transactions,
    },
    initView
  );

  const { collection, group, sort, filter, search: query, isShowingDetails } = state;

  // Prevents success toast from overriding a failure
  const errorToastPromise = useRef<Promise<Toast> | null>(null);
  useEffect(() => {
    // Showing an empty list will prevent users from accessing actions and will be stuck
    // We progressively back off in order to not fetch unnecessary data
    // This might cause problems for budgets with no transactions in the past year
    // TODO add a view for > 1 year, change to a different fallback model?

    if (!isLoadingBudget && !isLoading && transactions.length == 0) {
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

    // Keep the current query and previous filter state in sync with the new collection to filter
    dispatch({ type: 'search', query });

    if (filter?.key === 'unreviewed') {
      dispatch({ type: 'filter', filterBy: { key: 'unreviewed' } });
    }

    // Prevents success toast from overriding a failure
    if (errorToastPromise.current) {
      errorToastPromise.current.then((t) => setTimeout(() => t.hide(), 1500));
      errorToastPromise.current = null;
    } else {
      showToast({ style: Toast.Style.Success, title: `Showing transactions for the past ${timeline}` });
    }
  }, [timeline, transactions, isLoadingBudget, isLoading]);

  const onDropdownFilterChange = (newValue: string) => {
    if (newValue === 'all') {
      dispatch({ type: 'filter', filterBy: null });
    } else if (newValue === 'unreviewed') {
      dispatch({ type: 'filter', filterBy: { key: 'unreviewed' } });
    }
  };
  const dropDownValue = state.filter?.key === 'unreviewed' ? 'unreviewed' : 'all';

  return (
    <TransactionProvider
      dispatch={dispatch}
      state={{ group, sort, filter, timeline, isShowingDetails }}
      onTimelineChange={setTimeline}
    >
      <List
        isLoading={isValidating}
        isShowingDetail={isShowingDetails}
        searchBarPlaceholder={`Search transactions in the last ${timeline}`}
        searchText={state.search}
        onSearchTextChange={(query) => dispatch({ type: 'search', query })}
        searchBarAccessory={
          <TransactionViewDropdown selection={dropDownValue} onSelectionChange={onDropdownFilterChange} />
        }
      >
        {!Array.isArray(collection)
          ? Array.from(collection).map(([, group]) => (
              <List.Section
                title={group.title}
                subtitle={formatToReadablePrice({
                  amount: group.items.reduce((total, { amount }) => total + +amount, 0),
                  currency: activeBudgetCurrency,
                })}
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

interface TransactionViewDropdownProps {
  onSelectionChange: (newValue: string) => void;
  selection: string;
}

function TransactionViewDropdown(props: TransactionViewDropdownProps) {
  return (
    <List.Dropdown value={props.selection} tooltip="Select Transaction type" onChange={props.onSelectionChange}>
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Item title="Unreviewed" value="unreviewed" />
    </List.Dropdown>
  );
}
