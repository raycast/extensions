import { useEffect, useReducer, useRef, useState } from 'react';
import { List, showToast, Toast } from '@raycast/api';

import { TransactionItem } from './transactionItem';
import { initView, transactionViewReducer } from './viewReducer';
import { TransactionProvider } from './transactionContext';
import {
  CurrencyFormat,
  Filter,
  ScheduledTransactionDetail,
  TransactionDetail,
  TransactionDetailMap,
  type Period,
} from '@srcTypes';
import { useTransactions } from '@hooks/useTransactions';
import { formatToReadableAmount } from '@lib/utils';
import { useLocalStorage } from '@raycast/utils';
import { useScheduledTransactions } from '@hooks/useScheduledTransactions';
import { ScheduledTransactionItem } from './scheduledTransactionItem';

interface TransactionViewProps {
  search?: string;
  filter?: Filter;
}

export function TransactionView({ search = '', filter: defaultFilter = null }: TransactionViewProps) {
  const { value: activeBudgetCurrency, isLoading: isLoadingCurrency } = useLocalStorage<CurrencyFormat | null>(
    'activeBudgetCurrency',
    null,
  );
  const { value: activeBudgetId, isLoading: isLoadingBudget } = useLocalStorage('activeBudgetId', '');
  const {
    value: timeline,
    setValue: setTimeline,
    isLoading: isLoadingTimeline,
  } = useLocalStorage<Period>('timeline', 'month');

  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions(activeBudgetId, timeline);
  const { data: scheduledTransactions = [], isLoading: isLoadingScheduled } = useScheduledTransactions(activeBudgetId);

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
    initView,
  );

  const { collection, group, sort, filter, search: query, isShowingDetails } = state;

  useEffect(() => {
    if (!transactions.length) return;
    dispatch({ type: 'reset', initialCollection: transactions });
    dispatch({ type: 'search', query });

    if (filter?.key === 'unreviewed') {
      dispatch({ type: 'filter', filterBy: { key: 'unreviewed' } });
    }
  }, [transactions.length]);

  // Prevents success toast from overriding a failure
  const errorToastPromise = useRef<Promise<Toast> | null>(null);
  useEffect(() => {
    if (isLoadingCurrency || isLoadingTransactions || isLoadingBudget || isLoadingTimeline) return;
    if (transactions.length > 0) {
      if (!errorToastPromise.current) {
        showToast({ style: Toast.Style.Success, title: `Showing transactions for the past ${timeline}` });
      }
      return;
    }

    if (!timeline) return;

    const fallbackMap: Record<Period, Period | null> = {
      day: 'week',
      week: 'month',
      month: 'quarter',
      quarter: 'year',
      year: null,
    };
    const fallbackTimeline = fallbackMap[timeline];

    if (fallbackTimeline !== null) {
      setTimeline(fallbackTimeline);

      errorToastPromise.current = showToast({
        style: Toast.Style.Failure,
        title: `No results for the past ${timeline}`,
        message: `Falling back to the last ${fallbackTimeline}`,
      });
    } else {
      errorToastPromise.current = showToast({
        style: Toast.Style.Failure,
        title: `No results for the past ${timeline}`,
        message: `Unable to fetch transactions for this period`,
      });
    }

    // Clear error toast after success
    return () => {
      if (errorToastPromise.current) {
        errorToastPromise.current.then((t) => setTimeout(() => t.hide(), 1500));
        errorToastPromise.current = null;
      }
    };
  }, [isLoadingCurrency, isLoadingTransactions, isLoadingBudget, isLoadingTimeline, timeline, transactions.length]);

  const [displayScheduled, setDisplayScheduled] = useState(false);
  const onDropdownFilterChange = (newValue: string) => {
    setDisplayScheduled(false);
    switch (newValue) {
      case 'all':
        dispatch({ type: 'filter', filterBy: null });
        return;
      case 'unreviewed':
        dispatch({ type: 'filter', filterBy: { key: 'unreviewed' } });
        return;
      case 'scheduled':
        setDisplayScheduled(true);
        return;
      default:
        setDisplayScheduled(false);
        break;
    }
  };
  const dropDownValue = state.filter?.key === 'unreviewed' ? 'unreviewed' : 'all';

  const searchBarPlaceHolder = displayScheduled
    ? 'Search scheduled transactions'
    : `Search ${dropDownValue === 'unreviewed' ? 'unreviewed ' : ''}transactions in the last ${timeline}`;

  return (
    <TransactionProvider
      dispatch={dispatch}
      state={{ group, sort, filter, timeline, isShowingDetails }}
      onTimelineChange={setTimeline}
    >
      <List
        isLoading={
          isLoadingCurrency || isLoadingBudget || isLoadingTimeline || isLoadingTransactions || isLoadingScheduled
        }
        isShowingDetail={isShowingDetails}
        searchBarPlaceholder={searchBarPlaceHolder}
        searchText={state.search}
        onSearchTextChange={(query) => dispatch({ type: 'search', query })}
        filtering={displayScheduled}
        searchBarAccessory={
          <TransactionFilterDropdown selection={dropDownValue} onSelectionChange={onDropdownFilterChange} />
        }
      >
        <TransactionViewItems
          transactions={collection}
          scheduledTransactions={scheduledTransactions}
          displayScheduled={displayScheduled}
          currency={activeBudgetCurrency}
          activeFilter={dropDownValue}
        />
      </List>
    </TransactionProvider>
  );
}

interface TransactionFilterDropdownProps {
  onSelectionChange: (newValue: string) => void;
  selection: string;
}

function TransactionFilterDropdown(props: TransactionFilterDropdownProps) {
  return (
    <List.Dropdown value={props.selection} tooltip="Select Transaction type" onChange={props.onSelectionChange}>
      <List.Dropdown.Item title="Past Transactions" value="all" />
      <List.Dropdown.Item title="Unreviewed" value="unreviewed" />
      <List.Dropdown.Item title="Scheduled" value="scheduled" />
    </List.Dropdown>
  );
}

interface TransactionViewItemsProps {
  transactions: TransactionDetail[] | TransactionDetailMap;
  scheduledTransactions: ScheduledTransactionDetail[];
  displayScheduled: boolean;
  currency: CurrencyFormat;
  activeFilter: 'unreviewed' | 'all';
}

function TransactionViewItems({
  transactions,
  scheduledTransactions,
  displayScheduled: displaySchedule,
  currency,
  activeFilter,
}: TransactionViewItemsProps) {
  if (displaySchedule) {
    return scheduledTransactions.length > 0 ? (
      scheduledTransactions.map((t) => <ScheduledTransactionItem transaction={t} key={t.id} />)
    ) : (
      <List.EmptyView
        title="No Scheduled transactions"
        description="You don't have any scheduled transactions. Try adding some with the 'Schedule Transaction' command."
      />
    );
  }

  const isArray = Array.isArray(transactions);
  const hasTransactions = isArray ? transactions.length > 0 : transactions.size > 0;

  if (!hasTransactions) {
    return activeFilter === 'unreviewed' ? (
      <List.EmptyView
        title="Good job!"
        description="You don't have any unreviewed transactions."
        icon={{ source: '🎊' }}
      />
    ) : (
      <List.EmptyView
        title="No Transactions"
        description="You don't have any transactions. Try adding some with the `Create Transaction` command."
      />
    );
  }

  if (!isArray) {
    return Array.from(transactions).map(([, group]) => (
      <List.Section
        title={group.title}
        subtitle={formatToReadableAmount({
          amount: group.items.reduce((total, { amount }) => total + +amount, 0),
          currency,
        })}
        key={group.id}
        children={group.items.map((t) => (
          <TransactionItem transaction={t} key={t.id} />
        ))}
      />
    ));
  }

  return transactions.map((t) => <TransactionItem transaction={t} key={t.id} />);
}
