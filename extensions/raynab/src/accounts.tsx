import { AccountView } from '@components/accounts/accountView';
import { checkForActiveBudget } from '@lib/utils/checkForActiveBudget';

export default function Command() {
  const { activeBudgetId } = checkForActiveBudget();

  if (!activeBudgetId) {
    return null;
  }

  return <AccountView />;
}
