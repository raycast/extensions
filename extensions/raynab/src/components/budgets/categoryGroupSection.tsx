import { List } from '@raycast/api';
import type { CategoryGroupWithCategories, BudgetDetailSummary } from '@srcTypes';
import { CategoryItem } from './CategoryItem';

export function CategoryGroupSection({
  categoryGroups,
  budget,
}: {
  categoryGroups: CategoryGroupWithCategories[] | undefined;
  budget: BudgetDetailSummary | undefined;
}) {
  const validCategoryGroups = categoryGroups?.filter((group) => group.name !== 'Internal Master Category');

  return (
    <>
      {validCategoryGroups?.map((group) => (
        <List.Section key={group.id} title={group.name} subtitle={`${group.categories.length} Categories`}>
          {group.categories
            .filter((category) => !category.hidden)
            .map((category) => (
              <CategoryItem key={category.id} category={category} budget={budget} />
            ))}
        </List.Section>
      ))}
    </>
  );
}
