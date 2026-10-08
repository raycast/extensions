import { withCloudflareAccessToken, getCloudflareService } from '../oauth';

interface Input {
  /** Optional account ID returned by List Zones. */
  accountId?: string;
  /** Product to list. Defaults to both Pages and Workers. */
  product?: 'pages' | 'workers' | 'all';
  /** Maximum deployments per project or Worker, from 1 to 20. Defaults to 5. */
  limit?: number;
}

async function tool(input: Input) {
  const product = input.product ?? 'all';
  const limit = Math.min(20, Math.max(1, Math.floor(input.limit ?? 5)));
  const accounts = (await getCloudflareService().listAccounts()).filter(
    (account) => !input.accountId || account.id === input.accountId,
  );
  if (input.accountId && accounts.length === 0) {
    throw new Error(
      'accountId is not accessible. Call List Zones to resolve an account ID.',
    );
  }

  const results = await Promise.all(
    accounts.map(async (account) => {
      const pages =
        product === 'workers'
          ? []
          : await getCloudflareService().listPages(account.id);
      const workers =
        product === 'pages'
          ? []
          : await getCloudflareService().listWorkers(account.id);
      const [pageDeployments, workerDeployments] = await Promise.all([
        Promise.all(
          pages.map(async (page) =>
            (
              await getCloudflareService().listDeployments(
                account.id,
                page.name,
                limit,
              )
            ).map((deployment) => ({
              product: 'pages' as const,
              accountId: account.id,
              accountName: account.name,
              project: page.name,
              id: deployment.id,
              status: deployment.status,
              environment: deployment.environment,
              branch: deployment.trigger.branch,
              commitHash: deployment.commit.hash,
              commitMessage: deployment.commit.message,
              createdOn: deployment.createdOn,
              url: deployment.url,
            })),
          ),
        ),
        Promise.all(
          workers.map(async (worker) =>
            (
              await getCloudflareService().listWorkerDeployments(
                account.id,
                worker.id,
              )
            )
              .slice(0, limit)
              .map((deployment) => ({
                product: 'workers' as const,
                accountId: account.id,
                accountName: account.name,
                worker: worker.id,
                id: deployment.id,
                source: deployment.source,
                message: deployment.message,
                createdOn: deployment.createdOn,
                versions: deployment.versions.map((version) => ({
                  id: version.versionId,
                  percentage: version.percentage,
                })),
              })),
          ),
        ),
      ]);
      return [...pageDeployments.flat(), ...workerDeployments.flat()];
    }),
  );

  return results
    .flat()
    .sort(
      (a, b) =>
        new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
    );
}

export default withCloudflareAccessToken(tool);
