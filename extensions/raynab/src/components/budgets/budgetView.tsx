import { useBudget } from '@hooks/useBudget';
import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { getCurrentMonth } from '@lib/utils';
import { List } from '@raycast/api';
import { CategoryGroupSection } from './categoryGroupSection';

export function BudgetView() {
  const [activeBudgetId] = useLocalStorage('activeBudgetId', '');
  const { data: categoryGroups, isValidating: isLoadingCategories } = useCategoryGroups(activeBudgetId);
  const { data: budget, isValidating: isLoadingBudget } = useBudget(activeBudgetId);

  return (
    <List
      isLoading={isLoadingCategories || isLoadingBudget}
      searchBarPlaceholder={`Search categories in ${getCurrentMonth()}`}
    >
      <CategoryGroupSection categoryGroups={categoryGroups} budget={budget} />
    </List>
  );
}
