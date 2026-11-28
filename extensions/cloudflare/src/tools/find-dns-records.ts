import { withCloudflareAccessToken, getCloudflareService } from '../oauth';

interface Input {
  /** Search text matched against DNS record names, content, and types. */
  query: string;
  /** Optional zone ID returned by List Zones. Omit to search every accessible zone. */
  zoneId?: string;
}

async function tool(input: Input) {
  const query = input.query.trim();
  if (query.length < 2)
    throw new Error('query must contain at least two characters.');

  const accounts = await getCloudflareService().listAccounts();
  const zoneGroups = await Promise.all(
    accounts.map(async (account) =>
      (await getCloudflareService().listZones(account)).map((zone) => ({
        account,
        zone,
      })),
    ),
  );
  const zones = zoneGroups
    .flat()
    .filter(({ zone }) => !input.zoneId || zone.id === input.zoneId);
  if (input.zoneId && zones.length === 0) {
    throw new Error(
      'zoneId is not accessible. Call List Zones to resolve a valid zone ID.',
    );
  }

  const results = await Promise.all(
    zones.map(async ({ account, zone }) =>
      (await getCloudflareService().searchDnsRecords(zone.id, query)).map(
        (record) => ({
          accountId: account.id,
          accountName: account.name,
          zoneId: zone.id,
          zoneName: zone.name,
          id: record.id,
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl,
          proxied: record.proxied,
          comment: record.comment,
          tags: record.tags,
          priority: record.priority,
        }),
      ),
    ),
  );
  return results.flat();
}

export default withCloudflareAccessToken(tool);
