import { ActionPanel, Detail } from '@raycast/api';
import { OpenInYnabAction } from '@components/actions';
import { BudgetDetailSummary } from '@srcTypes';
import { formatToReadableAmount, getCurrentMonth } from '@lib/utils';

export function BudgetDetails({ budget }: { budget: BudgetDetailSummary | undefined }) {
  const currentMonthBudget = budget?.months?.at(0);
  const currency = budget?.currency_format;

  if (!currentMonthBudget) return null;

  const markdown = `
  # ${getCurrentMonth()}

  - **Budgeted**: ${formatToReadableAmount({
    amount: currentMonthBudget?.budgeted ?? 0,
    currency,
  })}
  - **Activity this month**: ${formatToReadableAmount({
    amount: currentMonthBudget.activity,
    currency,
  })}
  - **Age of Money**: ${currentMonthBudget.age_of_money ?? 0} days
  - **To be Budgeted**: ${formatToReadableAmount({
    amount: currentMonthBudget.to_be_budgeted,
    currency,
  })}
  - **Income**: ${formatToReadableAmount({
    amount: currentMonthBudget.income,
    currency,
  })}
  `;
  return (
    <Detail
      navigationTitle={`${getCurrentMonth()} Budget`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <OpenInYnabAction />
        </ActionPanel>
      }
    />
  );
}
