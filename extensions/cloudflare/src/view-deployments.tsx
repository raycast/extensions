import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { Deployment, WorkerDeployment } from './service';
import {
  getCommitUrl,
  getDeploymentStatusIcon,
  getDeploymentUrl,
  getWorkerUrl,
  handleNetworkError,
} from './utils';
import { PageDeploymentLogsView } from './view-pages';
import { WorkerDeploymentsView, WorkerVersionsView } from './view-workers';

type ProductFilter = 'all' | 'pages' | 'workers';

interface PageDeploymentResult {
  product: 'pages';
  accountId: string;
  accountName: string;
  projectName: string;
  deployment: Deployment;
}

interface WorkerDeploymentResult {
  product: 'workers';
  accountId: string;
  accountName: string;
  workerName: string;
  deployment: WorkerDeployment;
}

function Command() {
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const {
    isLoading,
    data: deployments = [],
    revalidate,
  } = useCachedPromise(
    async () => {
      const accounts = await getCloudflareService().listAccounts();
      const results = await Promise.all(
        accounts.map(async (account) => {
          const [pages, workers] = await Promise.all([
            getCloudflareService().listPages(account.id),
            getCloudflareService().listWorkers(account.id),
          ]);
          const [pageDeployments, workerDeployments] = await Promise.all([
            Promise.all(
              pages.map(async (page) =>
                (
                  await getCloudflareService().listDeployments(
                    account.id,
                    page.name,
                    5,
                  )
                ).map(
                  (deployment): PageDeploymentResult => ({
                    product: 'pages',
                    accountId: account.id,
                    accountName: account.name,
                    projectName: page.name,
                    deployment,
                  }),
                ),
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
                  .slice(0, 5)
                  .map(
                    (deployment): WorkerDeploymentResult => ({
                      product: 'workers',
                      accountId: account.id,
                      accountName: account.name,
                      workerName: worker.id,
                      deployment,
                    }),
                  ),
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
            new Date(b.deployment.createdOn).getTime() -
            new Date(a.deployment.createdOn).getTime(),
        );
    },
    [],
    { onError: handleNetworkError },
  );

  const filteredDeployments = deployments.filter(
    (deployment) =>
      productFilter === 'all' || deployment.product === productFilter,
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent Pages and Workers deployments"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Product"
          value={productFilter}
          onChange={(value) => setProductFilter(value as ProductFilter)}
        >
          <List.Dropdown.Item title="All Deployments" value="all" />
          <List.Dropdown.Item title="Pages" value="pages" />
          <List.Dropdown.Item title="Workers" value="workers" />
        </List.Dropdown>
      }
    >
      {!isLoading && filteredDeployments.length === 0 && (
        <List.EmptyView
          icon={Icon.Upload}
          title="No Deployments Found"
          description="No recent deployments match the selected product."
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                title="Reload Deployments"
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      )}
      {filteredDeployments.map((result) =>
        result.product === 'pages' ? (
          <PageDeploymentItem
            key={`pages-${result.accountId}-${result.deployment.id}`}
            result={result}
          />
        ) : (
          <WorkerDeploymentItem
            key={`workers-${result.accountId}-${result.deployment.id}`}
            result={result}
          />
        ),
      )}
    </List>
  );
}

function PageDeploymentItem({ result }: { result: PageDeploymentResult }) {
  const { accountId, accountName, projectName, deployment } = result;
  return (
    <List.Item
      icon={getDeploymentStatusIcon(deployment.status)}
      title={projectName}
      subtitle={deployment.commit.message}
      keywords={[accountName, deployment.environment ?? '', 'Pages']}
      accessories={[
        { tag: 'Pages' },
        { text: accountName },
        {
          date: new Date(deployment.createdOn),
          tooltip: new Date(deployment.createdOn).toLocaleString(),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Terminal}
            title="Show Build Logs"
            target={
              <PageDeploymentLogsView
                accountId={accountId}
                pageName={projectName}
                deploymentId={deployment.id}
              />
            }
          />
          <Action.OpenInBrowser title="Open Deployment" url={deployment.url} />
          <Action.OpenInBrowser
            title="Open on Cloudflare"
            url={getDeploymentUrl(accountId, projectName, deployment.id)}
          />
          {deployment.source && deployment.commit.hash && (
            <Action.OpenInBrowser
              title="Open Commit"
              url={getCommitUrl(deployment.source, deployment.commit.hash)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Deployment URL"
            content={deployment.url}
          />
        </ActionPanel>
      }
    />
  );
}

function WorkerDeploymentItem({ result }: { result: WorkerDeploymentResult }) {
  const { accountId, accountName, workerName, deployment } = result;
  return (
    <List.Item
      icon={Icon.Code}
      title={workerName}
      subtitle={deployment.message || `Deployment ${deployment.id.slice(0, 8)}`}
      keywords={[accountName, deployment.source ?? '', 'Workers']}
      accessories={[
        { tag: 'Workers' },
        { text: accountName },
        {
          date: new Date(deployment.createdOn),
          tooltip: new Date(deployment.createdOn).toLocaleString(),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Upload}
            title="Show Worker Deployments"
            target={
              <WorkerDeploymentsView
                accountId={accountId}
                workerName={workerName}
              />
            }
          />
          <Action.Push
            icon={Icon.Clock}
            title="Show Worker Versions"
            target={
              <WorkerVersionsView
                accountId={accountId}
                workerName={workerName}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open Worker on Cloudflare"
            url={getWorkerUrl(accountId, workerName)}
          />
          <Action.CopyToClipboard
            title="Copy Deployment ID"
            content={deployment.id}
          />
        </ActionPanel>
      }
    />
  );
}

export default withCloudflareAccessToken(Command);
