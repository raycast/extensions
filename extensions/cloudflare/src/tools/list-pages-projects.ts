import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveAccount } from './helpers';

interface Input {
  /** Optional account ID returned by List Zones. Omit to list projects from every accessible account. */
  accountId?: string;
}

async function tool(input: Input) {
  const accounts = input.accountId
    ? [await resolveAccount(input.accountId)]
    : await getCloudflareService().listAccounts();
  const groups = await Promise.all(
    accounts.map(async (account) =>
      (await getCloudflareService().listPages(account.id)).map((page) => ({
        accountId: account.id,
        accountName: account.name,
        name: page.name,
        subdomain: page.subdomain,
        status: page.status,
        source: page.source
          ? {
              type: page.source.type,
              owner: page.source.config.owner,
              repository: page.source.config.repo,
              autopublishEnabled: page.source.config.autopublishEnabled,
            }
          : undefined,
      })),
    ),
  );
  return groups.flat();
}

export default withCloudflareAccessToken(tool);
