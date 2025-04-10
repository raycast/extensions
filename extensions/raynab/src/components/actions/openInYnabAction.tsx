import { Action } from '@raycast/api';
import { URLs } from '@constants';
import { useLocalStorage } from '@raycast/utils';
import { Icon } from '@raycast/api';

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

  return <Action.OpenInBrowser title="Open in Ynab" url={constructUrl(activeBudgetId, props)} icon={Icon.Globe} />;
}
