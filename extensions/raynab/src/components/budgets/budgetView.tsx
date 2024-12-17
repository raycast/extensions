import { useBudget } from '@hooks/useBudget';
import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { getCurrentMonth } from '@lib/utils';
import { List } from '@raycast/api';
import { CategoryGroupSection } from './categoryGroupSection';
import { useLocalStorage } from '@raycast/utils';
import { useReducer } from 'react';
import { categoryViewReducer, initView } from './viewReducer';
import { CategoriesProvider } from './budgetContext';

export function BudgetView() {
  const { value: activeBudgetId } = useLocalStorage('activeBudgetId', '');
  const { data: categoryGroups, isValidating: isLoadingCategories } = useCategoryGroups(activeBudgetId);
  const { data: budget, isValidating: isLoadingBudget } = useBudget(activeBudgetId);

  const [state, dispatch] = useReducer(
    categoryViewReducer,
    {
      isDetailed: false,
      isShowingProgress: false,
    },
    initView
  );

  return (
    <CategoriesProvider state={state} dispatch={dispatch}>
      <List
        isLoading={isLoadingCategories || isLoadingBudget}
        searchBarPlaceholder={`Search categories in ${getCurrentMonth()}`}
        isShowingDetail={state.isDetailed}
      >
        <CategoryGroupSection categoryGroups={categoryGroups} budget={budget} />
      </List>
    </CategoriesProvider>
  );
}
