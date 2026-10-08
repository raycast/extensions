import { getPreferenceValues } from "@raycast/api";
import { assertBeeperConnection, listAccounts } from "../api";
import { MOCK_ACCOUNTS } from "../utils/mock-data";
import { getAccountServiceInfoList } from "../utils/account-service-cache";

export default async function () {
  const { useMockData } = getPreferenceValues<Preferences>();
  if (useMockData) {
    return MOCK_ACCOUNTS.map((account) => ({
      service: account.service,
      displayName: account.displayName,
      username: account.username,
      isConnected: account.isConnected,
    }));
  }

  await assertBeeperConnection();

  const accounts = await listAccounts();
  const accountInfo = getAccountServiceInfoList(accounts);

  return accountInfo.map((account) => ({
    service: account.serviceLabel,
    displayName: account.accountDisplayName,
    username: account.username,
    isConnected: true,
  }));
}
