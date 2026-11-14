import { withCloudflareAccessToken, getCloudflareService } from '../oauth';

async function tool() {
  const accounts = await getCloudflareService().listAccounts();
  const zones = await Promise.all(
    accounts.map(async (account) =>
      (await getCloudflareService().listZones(account)).map((zone) => ({
        accountId: account.id,
        accountName: account.name,
        zoneId: zone.id,
        zoneName: zone.name,
        status: zone.status,
        nameServers: zone.nameServers,
      })),
    ),
  );
  return zones.flat();
}

export default withCloudflareAccessToken(tool);
