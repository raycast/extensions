import { useState } from 'react';
import { Category as ynabCategory } from 'ynab';
import { OpenInYnabAction } from '@components/actions';
import { TransactionCreationForm } from '@components/transactions/transactionCreationForm';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { formatToReadablePrice } from '@lib/utils';
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { CurrencyFormat, Category, CategoryGroupWithCategories, BudgetDetailSummary } from '@srcTypes';
import { BudgetDetails } from './budgetDetails';
import { CategoryDetails } from './categoryDetails';
import { CategoryEditForm } from './categoryEditForm';

export function CategoryGroupSection({
  categoryGroups,
  budget,
}: {
  categoryGroups: CategoryGroupWithCategories[] | undefined;
  budget: BudgetDetailSummary | undefined;
}) {
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const [showProgress, setshowProgress] = useState(false);

  return (
    <>
      {categoryGroups
        ?.filter((group) => group.name !== 'Internal Master Category')
        ?.map((group) => (
          <List.Section key={group.id} title={group.name} subtitle={`${group.categories.length} Categories`}>
            {group.categories.map((category) => (
              // TODO create unique icons for different goal types
              <List.Item
                key={category.id}
                id={category.id}
                title={category.name}
                accessories={[
                  {
                    tag: {
                      value: showProgress
                        ? renderProgressTitle(category)
                        : formatToReadablePrice({ amount: category.balance, currency: activeBudgetCurrency }),
                      color: getGoalColor(assessGoalShape(category)),
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Inspect Budget">
                      <Action.Push
                        title="Show Category"
                        icon={Icon.Eye}
                        target={<CategoryDetails category={category} />}
                      />
                      <Action.Push
                        title="Show Monthly Budget"
                        icon={Icon.Envelope}
                        target={<BudgetDetails budget={budget} />}
                      />
                      <OpenInYnabAction />
                      <Action
                        icon={Icon.Binoculars}
                        title={`${showProgress ? 'Hide' : 'Show'} Progress`}
                        onAction={() => setshowProgress((s) => !s)}
                        shortcut={{ modifiers: ['cmd'], key: 'p' }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Modify List View">
                      <Action.Push
                        title="Edit Category"
                        icon={Icon.Pencil}
                        target={<CategoryEditForm category={category} />}
                        shortcut={{ modifiers: ['cmd'], key: 'e' }}
                      />
                      <Action.Push
                        title="Create New Transaction"
                        icon={Icon.Plus}
                        target={<TransactionCreationForm categoryId={category.id} />}
                        shortcut={{ modifiers: ['opt'], key: 'c' }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </>
  );
}

const FULL_SYMBOL = '●';
const EMPTY_SYMBOL = '○';
const MAX_SYMBOL_COUNT = 10;
function renderProgressTitle(category: Category) {
  const percentage = category.goal_percentage_complete;

  if (!category.goal_type) return 'N/A';

  const fullSymbolsCount = Math.min(Math.round(((percentage ?? 0) * MAX_SYMBOL_COUNT) / 100), 100);

  const emptySymbolsCount = MAX_SYMBOL_COUNT - fullSymbolsCount;

  return `${FULL_SYMBOL.repeat(fullSymbolsCount)}${EMPTY_SYMBOL.repeat(emptySymbolsCount)} ${percentage
    ?.toString()
    .padStart(3, ' ')}%`;
}

type GoalShape = 'underfunded' | 'funded' | 'overspent' | 'neutral';

function assessGoalShape(category: Category): GoalShape {
  /*
    There are multiple types of goals, the goal shape depends on the type
    As of March 8th 2023, we have the following
    (TB='Target Category Balance', TBD='Target Category Balance by Date', MF='Monthly Funding', NEED='Plan Your Spending')
    - TB: Save a certain amount
    - TBD: Save a certain amount by a certain date -> can be on or off-track
    - MF: Save a certain amount no matter what
    - NEED: Save a certain amount, but be able to spend it along the way on a monthly basis
  */

  // No matter the goal type, if the balance is negative, the goal has been overspent
  if (category.balance < 0) return 'overspent';

  switch (category.goal_type) {
    case ynabCategory.GoalTypeEnum.TB:
      return category.goal_percentage_complete === 100
        ? 'funded'
        : Number(category.goal_percentage_complete) > 0
        ? 'underfunded'
        : 'neutral';
    case ynabCategory.GoalTypeEnum.TBD:
    case ynabCategory.GoalTypeEnum.NEED:
    case ynabCategory.GoalTypeEnum.MF:
      return category.goal_percentage_complete === 100 || category.goal_under_funded === 0 ? 'funded' : 'underfunded';
    default:
      break;
  }

  return 'neutral';
}

function getGoalColor(goalShape: GoalShape) {
  switch (goalShape) {
    case 'neutral':
      return Color.SecondaryText;
    case 'funded':
      return Color.Green;
    case 'underfunded':
      return Color.Yellow;
    case 'overspent':
      return Color.Red;
  }
}
