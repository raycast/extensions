import { getPreferenceValues } from "@raycast/api";
import { getBeeperClient, checkBeeperConnection } from "../services/beeper-client";
import { getServiceDisplayName } from "../utils/service-icons";
import { MOCK_ACCOUNTS } from "../utils/mock-data";
import { buildAccountServiceCache } from "../utils/account-service-cache";

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

  const connectionStatus = await checkBeeperConnection();
  if (!connectionStatus.connected) {
    throw new Error(connectionStatus.error || "Cannot connect to Beeper Desktop");
  }

  const client = await getBeeperClient();
  const accounts = await client.accounts.list();
  const accountInfo = Array.from(buildAccountServiceCache(accounts || []).values());

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
