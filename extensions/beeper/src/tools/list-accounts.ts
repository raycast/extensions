import { getPreferenceValues } from "@raycast/api";
import { assertBeeperConnection, listAccounts } from "../api";
import { getServiceDisplayName } from "../utils/service-icons";
import { MOCK_ACCOUNTS } from "../utils/mock-data";
import { getAccountServiceInfoList } from "../utils/account-service-cache";

export default async function () {
  const { useMockData } = getPreferenceValues<Preferences>();
  if (useMockData) {
    return MOCK_ACCOUNTS.map((account) => ({
      service: getServiceDisplayName(account.service),
      serviceId: account.service,
      displayName: account.displayName,
      username: account.username,
      isConnected: account.isConnected,
    }));
  }

  await assertBeeperConnection();

  const client = await getBeeperClient();
  const accounts = await listAccounts();
  const accountInfo = getAccountServiceInfoList(accounts);

  return accountInfo.map((account) => {
    return {
      service: getServiceDisplayName(account.service),
      serviceId: account.service,
      displayName: account.accountDisplayName,
      username: account.username,
      isConnected: true,
    };
  });
}
