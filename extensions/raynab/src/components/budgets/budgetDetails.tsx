import { ActionPanel, Detail } from '@raycast/api';
import { OpenInYnabAction } from '@components/actions';
import { BudgetDetailSummary } from '@srcTypes';
import { formatToReadablePrice, getCurrentMonth } from '@lib/utils';

export function BudgetDetails({ budget }: { budget: BudgetDetailSummary | undefined }) {
  const currentMonthBudget = budget?.months?.at(0);
  const currency = budget?.currency_format;

  if (!currentMonthBudget) return null;

  const markdown = `
  # ${getCurrentMonth()}

  - **Budgeted**: ${formatToReadablePrice({
    amount: currentMonthBudget?.budgeted ?? 0,
    currency,
  })}
  - **Activity this month**: ${formatToReadablePrice({
    amount: currentMonthBudget.activity,
    currency,
  })}
  - **Age of Money**: ${currentMonthBudget.age_of_money ?? 0} days
  - **To be Budgeted**: ${formatToReadablePrice({
    amount: currentMonthBudget.to_be_budgeted,
    currency,
  })}
  - **Income**: ${formatToReadablePrice({
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
