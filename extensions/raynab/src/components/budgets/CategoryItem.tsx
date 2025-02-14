import { Action, ActionPanel, Icon, List } from '@raycast/api';

import { OpenInYnabAction } from '@components/actions';
import { TransactionCreateForm } from '@components/transactions/transactionCreateForm';
import {
  assessGoalShape,
  displayGoalType,
  formatToReadableAmount,
  displayGoalColor,
  formatGoalCadenceAndFrequency,
  time,
} from '@lib/utils';
import type { Category, BudgetDetailSummary } from '@srcTypes';
import { BudgetDetails } from './budgetDetails';
import { CategoryEditForm } from './categoryEditForm';
import { Shortcuts } from '@constants';
import { ToggleDetailsAction } from '@components/actions/toggleDetailsAction';
import { useCategories } from './budgetContext';
import { TransactionView } from '@components/transactions/transactionView';

export function CategoryItem({ category, budget }: { category: Category; budget: BudgetDetailSummary | undefined }) {
  const {
    state: { isDetailed, isShowingProgress },
    toggleDetails,
    toggleProgress,
    currency,
  } = useCategories();

  const goalShape = assessGoalShape(category);
  const goalColor = displayGoalColor(goalShape);
  const formattedTarget = formatGoalCadenceAndFrequency(category, currency);

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
          : formatToReadableAmount({ amount: category.balance, currency: currency }),
        color: goalColor,
      },
    },
  ];

  const activityInCurrency = formatToReadableAmount({ amount: category.activity, currency: currency });
  const hasGoal = !!category.goal_creation_month;

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
                text={formatToReadableAmount({ amount: category.balance, currency: currency })}
              />
              <List.Item.Detail.Metadata.Label
                title="Activity"
                text={`${category.activity > 0 ? '+' : ''}${activityInCurrency}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Budgeted"
                text={formatToReadableAmount({ amount: category.budgeted, currency })}
              />
              <List.Item.Detail.Metadata.Label title="Goal Target" text={formattedTarget} />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={goalShape[0].toUpperCase().concat(goalShape.slice(1))}
                  color={goalColor}
                />
              </List.Item.Detail.Metadata.TagList>
              {hasGoal ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Goal Created"
                    text={time(category.goal_creation_month).format('LL')}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Percentage completed"
                    text={`${category.goal_percentage_complete ?? 0}%`}
                  />
                  {(category.goal_months_to_budget ?? 0 > 0) ? (
                    <List.Item.Detail.Metadata.Label title="Months to go" text={`${category.goal_months_to_budget}`} />
                  ) : null}
                </>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Inspect Budget">
            <ToggleDetailsAction showDetails={isDetailed} toggleDetails={toggleDetails} />
            <Action.Push title="Show Monthly Budget" icon={Icon.Envelope} target={<BudgetDetails budget={budget} />} />
            <Action.Push
              title="Show Related Transactions"
              icon={Icon.MagnifyingGlass}
              target={<TransactionView search={`category:${category.name.toLowerCase()}`} />}
              shortcut={Shortcuts.ShowTransactionsForCategory}
            />
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
              target={<TransactionCreateForm categoryId={category.id} />}
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

  if (percentage == undefined) return 'N/A';

  const fullSymbolsCount = Math.min(Math.round(((percentage ?? 0) * MAX_SYMBOL_COUNT) / 100), 100);

  const emptySymbolsCount = MAX_SYMBOL_COUNT - fullSymbolsCount;

  return `${FULL_SYMBOL.repeat(fullSymbolsCount)}${EMPTY_SYMBOL.repeat(emptySymbolsCount)} ${percentage
    ?.toString()
    .padStart(3, ' ')}%`;
}
