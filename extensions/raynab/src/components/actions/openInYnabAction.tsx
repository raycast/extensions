import { Action, Icon } from '@raycast/api';
import { Shortcuts, URLs } from '@constants';
import { useLocalStorage } from '@raycast/utils';

interface OpenInYnabActionProps {
  accounts?: boolean;
  accountId?: string;
  yearMonth?: string;
}

export function OpenInYnabAction(props: OpenInYnabActionProps) {
  const { value: activeBudgetId = '' } = useLocalStorage('activeBudgetId', '');

  const constructUrl = (budgetId: string, { accounts, accountId, yearMonth } = props) => {
    const budgetPath = `${URLs.ynab}/${budgetId}/`;

    if (yearMonth) return budgetPath + yearMonth;

    if (accounts) return `${budgetPath}/accounts/${accountId ?? ''}`;

    return budgetPath;
  };

  return (
    <Action.OpenInBrowser
      title="Open in Ynab"
      url={constructUrl(activeBudgetId, props)}
      icon={Icon.Globe}
      shortcut={Shortcuts.ViewInBrowser}
    />
  );
}
