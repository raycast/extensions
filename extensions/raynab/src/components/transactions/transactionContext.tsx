import { useLocalStorage } from '@raycast/utils';
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
  TransactionViewAction,
} from '@srcTypes';

import { createContext, useContext, useState, type ReactNode } from 'react';

type TransactionContextReturnValues = {
  onGroup: onGroupType;
  onFilter: onFilterType;
  onSort: onSortType;
  onTimelineChange: onTimelineType;
  toggleDetails: () => void;
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
  dispatch: React.Dispatch<TransactionViewAction>;
  state: Omit<TransactionState, 'search'>;
  onTimelineChange: onTimelineType;
  children: ReactNode;
}) {
  const onFilter = (filterType: Filter) => () => dispatch({ type: 'filter', filterBy: filterType });
  const onGroup = (groupType: GroupNames) => () => dispatch({ type: 'group', groupBy: groupType });
  const onSort = (sortType: SortNames) => () => dispatch({ type: 'sort', sortBy: sortType });
  const toggleDetails = () => dispatch({ type: 'toggleDetails' });

  const flags = useState(false);

  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  return (
    <TransactionContext.Provider
      value={{
        onFilter,
        onGroup,
        onSort,
        onTimelineChange,
        toggleDetails,
        state,
        flags,
        currency: activeBudgetCurrency,
      }}
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
