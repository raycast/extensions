import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { basecamp, fetchAccounts } from "./oauth/auth";
import { AccountsList } from "./components/AccountsList";

function Command() {
  const { isLoading, data: accounts, error } = useCachedPromise(fetchAccounts);

  if (error) {
    throw error;
  }

  return <AccountsList accounts={accounts || []} isLoading={isLoading} />;
}

export default withAccessToken(basecamp)(Command);
