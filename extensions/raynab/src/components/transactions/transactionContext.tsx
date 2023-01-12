import { useLocalStorage } from '@hooks/useLocalStorage';
import {
  CurrencyFormat,
  Filter,
  GroupNames,
  onFilterType,
  onGroupType,
  onSortType,
  onTimelineType,
  SortNames,
  TransactionState,
  ViewAction,
} from '@srcTypes';

import { createContext, useContext, useState, type ReactNode } from 'react';

type TransactionContextReturnValues = {
  onGroup: onGroupType;
  onFilter: onFilterType;
  onSort: onSortType;
  onTimelineChange: onTimelineType;
  state: Omit<TransactionState, 'search'>;
  flags: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  currency: CurrencyFormat;
};
const TransactionContext = createContext<TransactionContextReturnValues | null>(null);

export function TransactionProvider({
  dispatch,
  state,
  onTimelineChange,
  children,
}: {
  dispatch: React.Dispatch<ViewAction>;
  state: Omit<TransactionState, 'search'>;
  onTimelineChange: onTimelineType;
  children: ReactNode;
}) {
  const onFilter = (filterType: Filter) => () => dispatch({ type: 'filter', filterBy: filterType });
  const onGroup = (groupType: GroupNames) => () => dispatch({ type: 'group', groupBy: groupType });
  const onSort = (sortType: SortNames) => () => dispatch({ type: 'sort', sortBy: sortType });

  const flags = useState(false);
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  return (
    <TransactionContext.Provider
      value={{ onFilter, onGroup, onSort, onTimelineChange, state, flags, currency: activeBudgetCurrency }}
      children={children}
    />
  );
}

export function useTransaction() {
  const value = useContext(TransactionContext);

  if (!value) {
    throw new Error('useTransaction must be used inside a TransactionContext');
  }

  return value;
}
