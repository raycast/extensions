import { Action, ActionPanel, Detail, Icon, List } from '@raycast/api';
import { useEffect, useState } from 'react';

import Service, { Account, Deployment, Domain, Page } from './service';
import {
  getCommitUrl,
  getDeploymentStatusIcon,
  getDeploymentUrl,
  getDomainStatusIcon,
  getToken,
  getPageUrl,
  getRepoUrl,
  handleNetworkError,
  toUrl,
} from './utils';

const service = new Service(getToken());

function Command() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pages, setPages] = useState<Record<string, Page[]>>({});
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPages() {
      try {
        const accounts = await service.listAccounts();
        setAccounts(accounts);

        const pages: Record<string, Page[]> = {};
        for (let i = 0; i < accounts.length; i++) {
          const account = accounts[i];
          const accountPages = await service.listPages(account.id);
          pages[account.id] = accountPages;
        }
        setPages(pages);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchPages();
  }, []);

  return (
    <List isLoading={isLoading}>
      {Object.entries(pages)
        .filter((entry) => entry[1].length > 0)
        .map((entry) => {
          const [accountId, accountPages] = entry;
          const account = accounts.find((account) => account.id === accountId);
          const name = account?.name || '';
          return (
            <List.Section title={name}>
              {accountPages.map((page) => (
                <List.Item
                  key={page.name}
                  icon={getDeploymentStatusIcon(page.status)}
                  title={page.name}
                  accessoryTitle={page.subdomain}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        icon={Icon.TextDocument}
                        title="Show Details"
                        target={
                          <PageView accountId={accountId} name={page.name} />
                        }
                      />
                      <Action.Push
                        icon={Icon.List}
                        title="Show Deployments"
                        target={
                          <DeploymentListView
                            accountId={accountId}
                            pageName={page.name}
                          />
                        }
                      />
                      <Action.Push
                        icon={Icon.List}
                        title="Show Domains"
                        target={
                          <DomainListView
                            accountId={accountId}
                            pageName={page.name}
                          />
                        }
                        shortcut={{ modifiers: ['cmd'], key: 'd' }}
                      />
                      <Action.OpenInBrowser
                        title="Open Page"
                        url={toUrl(page.subdomain)}
                        shortcut={{ modifiers: ['cmd'], key: 'p' }}
                      />
                      <Action.OpenInBrowser
                        title="Open Repo"
                        url={getRepoUrl(page.source)}
                        shortcut={{ modifiers: ['cmd'], key: 'r' }}
                      />
                      <Action.OpenInBrowser
                        title="Open on Cloudflare"
                        url={getPageUrl(accountId, page.name)}
                        shortcut={{ modifiers: ['cmd'], key: 'f' }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

interface PageProps {
  accountId: string;
  name: string;
}

function PageView(props: PageProps) {
  const { accountId, name } = props;

  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPages() {
      try {
        const page = await service.getPage(accountId, name);
        setPage(page);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchPages();
  }, []);

  if (!page) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  const markdown = `
  # Page

  ## Name

  ${page.name}

  ## Subdomain

  ${page.subdomain}

  ## Status

  ${page.status}

  ## Autopublish enabled

  ${page.source.config.autopublishEnabled}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.List}
            title="Show Deployments"
            target={
              <DeploymentListView accountId={accountId} pageName={page.name} />
            }
          />
          <Action.Push
            icon={Icon.List}
            title="Show Domains"
            target={
              <DomainListView accountId={accountId} pageName={page.name} />
            }
          />
          <Action.OpenInBrowser
            title="Open Page"
            url={toUrl(page.subdomain)}
            shortcut={{ modifiers: ['cmd'], key: 'p' }}
          />
          <Action.OpenInBrowser
            title="Open Repo"
            url={getRepoUrl(page.source)}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <Action.OpenInBrowser
            title="Open on Cloudflare"
            url={getPageUrl(accountId, page.name)}
            shortcut={{ modifiers: ['cmd'], key: 'f' }}
          />
        </ActionPanel>
      }
    />
  );
}

interface DeploymentListProps {
  accountId: string;
  pageName: string;
}

function DeploymentListView(props: DeploymentListProps) {
  const { accountId, pageName } = props;

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeployments() {
      try {
        const deployments = await service.listDeployments(accountId, pageName);
        setDeployments(deployments);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchDeployments();
  }, []);

  return (
    <List isLoading={isLoading}>
      {deployments.map((deployment) => (
        <List.Item
          key={deployment.id}
          icon={getDeploymentStatusIcon(deployment.status)}
          title={deployment.commit.message}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.TextDocument}
                title="Show Details"
                target={
                  <DeploymentView
                    accountId={accountId}
                    pageName={pageName}
                    id={deployment.id}
                  />
                }
              />
              <Action.OpenInBrowser
                title="Open Page"
                url={deployment.url}
                shortcut={{ modifiers: ['cmd'], key: 'p' }}
              />
              <Action.OpenInBrowser
                title="Open Repo"
                url={getCommitUrl(deployment.source, deployment.commit.hash)}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
              />
              <Action.OpenInBrowser
                title="Open on Cloudflare"
                url={getDeploymentUrl(accountId, pageName, deployment.id)}
                shortcut={{ modifiers: ['cmd'], key: 'f' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface DeploymentProps {
  accountId: string;
  pageName: string;
  id: string;
}

function DeploymentView(props: DeploymentProps) {
  const { accountId, pageName, id } = props;

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeployment() {
      try {
        const deployment = await service.getDeployment(accountId, pageName, id);
        setDeployment(deployment);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchDeployment();
  }, []);

  if (!deployment) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  const markdown = `
  # Deploy

  ## Commit

  ${deployment.commit.message}

  ## Status

  ${deployment.status}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Page"
            url={deployment.url}
            shortcut={{ modifiers: ['cmd'], key: 'p' }}
          />
          <Action.OpenInBrowser
            title="Open Repo"
            url={getCommitUrl(deployment.source, deployment.commit.hash)}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <Action.OpenInBrowser
            title="Open on Cloudflare"
            url={getDeploymentUrl(accountId, pageName, id)}
            shortcut={{ modifiers: ['cmd'], key: 'f' }}
          />
        </ActionPanel>
      }
    />
  );
}

interface DomainListProps {
  accountId: string;
  pageName: string;
}

function DomainListView(props: DomainListProps) {
  const { accountId, pageName } = props;

  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDomains() {
      try {
        const domains = await service.listDomains(accountId, pageName);
        setDomains(domains);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchDomains();
  }, []);

  return (
    <List isLoading={isLoading}>
      {domains.map((domain) => (
        <List.Item
          key={domain.name}
          icon={getDomainStatusIcon(domain.status)}
          title={domain.name}
        />
      ))}
    </List>
  );
}

export default Command;
