import { Action, ActionPanel, Icon, List } from '@raycast/api';

import { OpenInYnabAction } from '@components/actions';
import { TransactionCreationForm } from '@components/transactions/transactionCreationForm';
import { assessGoalShape, displayGoalType, formatGoalType, formatToReadablePrice, displayGoalColor } from '@lib/utils';
import type { Category, BudgetDetailSummary } from '@srcTypes';
import { BudgetDetails } from './budgetDetails';
import { CategoryEditForm } from './categoryEditForm';
import { Shortcuts } from '@constants';
import { ToggleDetailsAction } from '@components/actions/toggleDetailsAction';
import { useCategories } from './budgetContext';

export function CategoryItem({ category, budget }: { category: Category; budget: BudgetDetailSummary | undefined }) {
  const {
    state: { isDetailed, isShowingProgress },
    toggleDetails,
    toggleProgress,
    currency,
  } = useCategories();

  const goalShape = assessGoalShape(category);
  const goalColor = displayGoalColor(goalShape);
  const formattedTarget = formatGoalType(category, currency);

  const accessories = [
    category.goal_type && !isShowingProgress
      ? {
          icon: displayGoalType(category),
          tooltip: formattedTarget,
        }
      : {},
    {
      tag: {
        value: isShowingProgress
          ? renderProgressTitle(category)
          : formatToReadablePrice({ amount: category.balance, currency: currency }),
        color: goalColor,
      },
    },
  ];

  const activityInCurrency = formatToReadablePrice({ amount: category.activity, currency: currency });

  return (
    <List.Item
      key={category.id}
      id={category.id}
      title={category.name}
      accessories={!isDetailed ? accessories : []}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Balance"
                text={formatToReadablePrice({ amount: category.balance, currency: currency })}
              />
              <List.Item.Detail.Metadata.Label
                title="Activity"
                text={`${category.activity > 0 ? '+' : ''}${activityInCurrency}`}
              />

              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Goal Target"
                text={category.goal_target ? formatToReadablePrice({ amount: category.goal_target, currency }) : '—'}
              />
              <List.Item.Detail.Metadata.Label title="Goal Type" text={formattedTarget} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={goalShape[0].toUpperCase().concat(goalShape.slice(1))}
                  color={goalColor}
                />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Inspect Budget">
            <ToggleDetailsAction showDetails={isDetailed} toggleDetails={toggleDetails} />
            <Action.Push title="Show Monthly Budget" icon={Icon.Envelope} target={<BudgetDetails budget={budget} />} />
            <OpenInYnabAction />
            <Action
              icon={Icon.Binoculars}
              title={`${isShowingProgress ? 'Hide' : 'Show'} Progress`}
              onAction={toggleProgress}
              shortcut={Shortcuts.ShowBudgetProgress}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Modify List View">
            <Action.Push
              title="Edit Category"
              icon={Icon.Pencil}
              target={<CategoryEditForm category={category} />}
              shortcut={Shortcuts.EditBudgetCategory}
            />
            <Action.Push
              title="Create New Transaction"
              icon={Icon.Plus}
              target={<TransactionCreationForm categoryId={category.id} />}
              shortcut={Shortcuts.CreateNewTransaction}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
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
