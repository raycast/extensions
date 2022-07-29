import { ActionPanel, Detail } from '@raycast/api';
import { OpenInYnabAction } from '@components/actions';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { CurrencyFormat, Category } from '@srcTypes';
import { formatToReadablePrice } from '@lib/utils';

export function CategoryDetails({ category }: { category: Category }) {
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  const markdown = `
  # ${category.name} — ${formatToReadablePrice({ amount: category.balance, currency: activeBudgetCurrency })} left

  ${
    category.goal_type
      ? `- **Goal**: ${formatToReadablePrice({
          amount: category.goal_target ?? 0,
          currency: activeBudgetCurrency,
        })} — ${category.goal_under_funded ? 'Underfunded' : category.goal_overall_left ? 'On Track' : 'Funded'}`
      : ''
  }
  - **Budgeted**: ${formatToReadablePrice({ amount: category.budgeted, currency: activeBudgetCurrency })}
  - **Activity this month**: ${formatToReadablePrice({ amount: category.activity, currency: activeBudgetCurrency })}
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
