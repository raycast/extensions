import { getPreferenceValues } from "@raycast/api";
import { getBeeperClient, checkBeeperConnection } from "../services/beeper-client";
import { parseService } from "../utils/types";
import { getServiceDisplayName } from "../utils/service-icons";
import { MOCK_ACCOUNTS } from "../utils/mock-data";

interface Preferences {
  useMockData?: boolean;
}

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

  return (accounts || []).map((account) => {
    const service = parseService(account.network);
    return {
      service: getServiceDisplayName(service),
      serviceId: service,
      displayName: account.user?.fullName || account.network || "Unknown",
      username: account.user?.username,
      isConnected: true,
    };
  });
}
