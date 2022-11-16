import { Icon, List, ActionPanel, Action, Color, showToast, Toast } from '@raycast/api';
import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { BudgetSummary, CurrencyFormat } from '@srcTypes';
import { useBudgets } from '@hooks/useBudgets';
import { useLocalStorage } from '@hooks/useLocalStorage';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <BudgetList />
    </SWRConfig>
  );
}

function BudgetList() {
  const { data: budgets, isValidating } = useBudgets();

  const [activeBudgetId, setActiveBudgetId] = useLocalStorage('activeBudgetId', '');
  const [, setActiveBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  const selectActiveBudget = (budget: BudgetSummary) => () => {
    setActiveBudgetId(budget.id ?? '');
    setActiveBudgetCurrency(budget.currency_format ?? null);

    const wasSelectedBudget = budget.id === activeBudgetId;

    if (wasSelectedBudget) {
      showToast({
        title: `"${budget.name}" is already the active budget`,
        message: 'Settings will be updated across Raynab.',
      });
    } else {
      showToast({
        title: `"${budget.name}" is now the active budget`,
        message: 'It will be used across all commands in Raynab.',
      });
    }
  };

  return (
    <List isLoading={isValidating}>
      {budgets?.map((budget) => (
        <BudgetItem
          key={budget.id}
          budget={budget}
          selectedId={activeBudgetId ?? ''}
          onToggle={selectActiveBudget(budget)}
        />
      ))}
    </List>
  );
}

function BudgetItem({
  budget,
  selectedId,
  onToggle,
}: {
  budget: BudgetSummary;
  selectedId: string;
  onToggle: () => void;
}) {
  return (
    <List.Item
      icon={Icon.Document}
      title={budget.name}
      accessoryIcon={budget.id === selectedId ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle}
      actions={
        <ActionPanel title="Inspect Budget">
          <Action title="Select Budget" onAction={onToggle} />
        </ActionPanel>
      }
    />
  );
}
