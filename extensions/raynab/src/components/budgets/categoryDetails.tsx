import { ActionPanel, Detail } from '@raycast/api';
import { OpenInYnabAction } from '@components/actions';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { CurrencyFormat, Category } from '@srcTypes';
import { formatToReadablePrice } from '@lib/utils';

export function CategoryDetails({ category }: { category: Category }) {
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  const currencySymbol = activeBudgetCurrency?.currency_symbol ?? '';

  const markdown = `
  # ${category.name} — ${currencySymbol}${formatToReadablePrice(category.balance)} left

  ${
    category.goal_type
      ? `- **Goal**: ${currencySymbol}${formatToReadablePrice(category.goal_target ?? 0)} — ${
          category.goal_under_funded ? 'Underfunded' : category.goal_overall_left ? 'On Track' : 'Funded'
        }`
      : ''
  }
  - **Budgeted**: ${currencySymbol}${formatToReadablePrice(category.budgeted)}
  - **Activity this month**: ${formatToReadablePrice(category.activity)}
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
