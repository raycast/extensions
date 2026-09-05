import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveAccount } from './helpers';

interface Input {
  /** Optional account ID returned by List Zones. Omit to list Workers from every accessible account. */
  accountId?: string;
}

async function tool(input: Input) {
  const accounts = input.accountId
    ? [await resolveAccount(input.accountId)]
    : await getCloudflareService().listAccounts();
  const groups = await Promise.all(
    accounts.map(async (account) =>
      (await getCloudflareService().listWorkers(account.id)).map((worker) => ({
        accountId: account.id,
        accountName: account.name,
        name: worker.id,
        createdOn: worker.createdOn,
        modifiedOn: worker.modifiedOn,
        compatibilityDate: worker.compatibilityDate,
        compatibilityFlags: worker.compatibilityFlags,
        usageModel: worker.usageModel,
        handlers: worker.handlers,
        hasModules: worker.hasModules,
        hasAssets: worker.hasAssets,
      })),
    ),
  );
  return groups.flat();
}

export default withCloudflareAccessToken(tool);
