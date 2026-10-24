import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveAccount } from './helpers';

interface Input {
  /** Optional account ID returned by List Zones. Omit to inspect every accessible account. */
  accountId?: string;
  /** Maximum entries to return, from 1 to 100. Defaults to 20. */
  limit?: number;
}

async function tool(input: Input) {
  const limit = Math.min(100, Math.max(1, Math.floor(input.limit ?? 20)));
  const accounts = input.accountId
    ? [await resolveAccount(input.accountId)]
    : await getCloudflareService().listAccounts();
  const groups = await Promise.all(
    accounts.map(async (account) =>
      (await getCloudflareService().listAuditLogs(account.id)).map((entry) => ({
        id: entry.id,
        accountId: account.id,
        accountName: account.name,
        time: entry.action.time,
        action: entry.action.description,
        actionType: entry.action.type,
        result: entry.action.result,
        actorEmail: entry.actor.email,
        actorType: entry.actor.type,
        resource: entry.resource
          ? {
              id: entry.resource.id,
              product: entry.resource.product,
              type: entry.resource.type,
            }
          : undefined,
        zone: entry.zone
          ? { id: entry.zone.id, name: entry.zone.name }
          : undefined,
      })),
    ),
  );
  return groups
    .flat()
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit);
}

export default withCloudflareAccessToken(tool);
