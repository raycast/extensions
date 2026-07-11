import { ActionPanel, Detail } from '@raycast/api';
import { OpenInYnabAction } from '@components/actions';
import { CurrencyFormat, Category } from '@srcTypes';
import { formatToReadableAmount } from '@lib/utils';
import { useLocalStorage } from '@raycast/utils';

export function CategoryDetails({ category }: { category: Category }) {
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  const markdown = `
  # ${category.name} — ${formatToReadableAmount({ amount: category.balance, currency: activeBudgetCurrency })} left

  ${
    category.goal_type
      ? `- **Goal**: ${formatToReadableAmount({
          amount: category.goal_target ?? 0,
          currency: activeBudgetCurrency,
        })} — ${category.goal_under_funded ? 'Underfunded' : category.goal_overall_left ? 'On Track' : 'Funded'}`
      : ''
  }
  - **Budgeted**: ${formatToReadableAmount({ amount: category.budgeted, currency: activeBudgetCurrency })}
  - **Activity this month**: ${formatToReadableAmount({ amount: category.activity, currency: activeBudgetCurrency })}
  `;
  return (
    <Detail
      navigationTitle={`${category.name}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <OpenInYnabAction />
        </ActionPanel>
      }
    />
  );
}
