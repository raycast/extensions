import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveAccount } from './helpers';

interface Input {
  /** Optional account ID returned by List Zones. Omit to list members from every accessible account. */
  accountId?: string;
}

async function tool(input: Input) {
  const accounts = input.accountId
    ? [await resolveAccount(input.accountId)]
    : await getCloudflareService().listAccounts();
  const groups = await Promise.all(
    accounts.map(async (account) =>
      (await getCloudflareService().listMembers(account.id)).map((member) => ({
        accountId: account.id,
        accountName: account.name,
        email: member.email,
        status: member.status,
        role: member.role,
      })),
    ),
  );
  return groups.flat();
}

export default withCloudflareAccessToken(tool);
