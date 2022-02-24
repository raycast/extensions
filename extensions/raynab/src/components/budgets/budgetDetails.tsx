import { ActionPanel, Detail } from '@raycast/api';
import { OpenInYnabAction } from '@components/actions';
import { BudgetDetailSummary } from '@srcTypes';
import { formatToReadablePrice, getCurrentMonth } from '@lib/utils';

export function BudgetDetails({ budget }: { budget: BudgetDetailSummary | undefined }) {
  const currentMonthBudget = budget?.months?.at(0);
  const currencySymbol = budget?.currency_format?.currency_symbol ?? '';

  if (!currentMonthBudget) return null;

  const markdown = `
  # ${getCurrentMonth()}

  - **Budgeted**: ${currencySymbol}${formatToReadablePrice(currentMonthBudget?.budgeted ?? 0)}
  - **Activity this month**: ${formatToReadablePrice(currentMonthBudget.activity)}
  - **Age of Money**: ${currentMonthBudget.age_of_money ?? 0} days
  - **To be Budgeted**: ${currencySymbol}${formatToReadablePrice(currentMonthBudget.to_be_budgeted)}
  - **Income**: ${currencySymbol}${formatToReadablePrice(currentMonthBudget.income)}
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
