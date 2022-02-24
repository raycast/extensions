import { Icon, List, ActionPanel, Action, Color } from '@raycast/api';
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

  return (
    <List isLoading={isValidating}>
      {budgets?.map((budget) => (
        <BudgetItem
          key={budget.id}
          budget={budget}
          selectedId={activeBudgetId ?? ''}
          onToggle={() => {
            setActiveBudgetId(budget?.id ?? '');
            setActiveBudgetCurrency(budget.currency_format ?? null);
          }}
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
