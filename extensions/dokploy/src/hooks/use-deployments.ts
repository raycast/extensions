import { useCachedPromise } from "@raycast/utils";
import { DokployAccount } from "../accounts/types";
import { DokployClient } from "../api/client";
import { deploymentServiceRef, listAllDeployments } from "../api/dokploy-api";
import { CentralizedDeployment, DeploymentStatus, ServiceRef } from "../types/dokploy";

/** A deployment reduced to what the menu bar shows, plus the service it can link to. */
export interface DeploymentFeedItem {
  accountId: string;
  accountLabel: string;
  deploymentId: string;
  title: string;
  status?: DeploymentStatus;
  createdAt?: string;
  errorMessage?: string;
  service: ServiceRef;
}

function toFeedItems(account: DokployAccount, deployments: CentralizedDeployment[]): DeploymentFeedItem[] {
  const items: DeploymentFeedItem[] = [];

  for (const deployment of deployments) {
    // Schedule, backup and volume-backup runs live in the same table but own no service, so they
    // have nothing to link to and are dropped from the feed.
    const service = deploymentServiceRef(deployment);
    if (!service) continue;

    items.push({
      accountId: account.id,
      accountLabel: account.label,
      deploymentId: deployment.deploymentId,
      title: deployment.title || "Deployment",
      status: deployment.status,
      createdAt: deployment.createdAt,
      errorMessage: deployment.errorMessage ?? undefined,
      service,
    });
  }

  return items;
}

/**
 * The deployment feed across every connected account, newest first.
 *
 * The API does not promise an ordering - the rows come back grouped by service - so they are
 * sorted here. As with projects, one unreachable instance is skipped rather than allowed to empty
 * the whole feed, and the cache key is the account ids, never the accounts themselves.
 */
export function useAllDeployments(accounts: DokployAccount[], limit = 8) {
  const accountIds = accounts.map((account) => account.id).join(",");

  return useCachedPromise(
    async (ids: string): Promise<DeploymentFeedItem[]> => {
      if (!ids) return [];

      const results = await Promise.allSettled(
        accounts.map((account) => listAllDeployments(new DokployClient(account))),
      );

      const items = results.flatMap((result, index) =>
        result.status === "fulfilled" ? toFeedItems(accounts[index], result.value) : [],
      );

      return items
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .slice(0, limit);
    },
    [accountIds],
    {
      execute: accounts.length > 0,
      initialData: [] as DeploymentFeedItem[],
    },
  );
}
