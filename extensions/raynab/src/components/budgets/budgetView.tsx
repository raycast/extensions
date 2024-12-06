import { useBudget } from '@hooks/useBudget';
import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { getCurrentMonth } from '@lib/utils';
import { List } from '@raycast/api';
import { CategoryGroupSection } from './categoryGroupSection';
import { useLocalStorage } from '@raycast/utils';

export function BudgetView() {
  const { value: activeBudgetId } = useLocalStorage('activeBudgetId', '');
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
