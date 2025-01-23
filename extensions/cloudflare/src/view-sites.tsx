import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from '@raycast/api';

import Service, { Zone } from './service';
import {
  getToken,
  getSiteStatusIcon,
  getSiteUrl,
  handleNetworkError,
} from './utils';
import { CachePurgeView, purgeEverything } from './view-cache-purge';
import { useCachedPromise } from '@raycast/utils';

const service = new Service(getToken());

function Command() {
  const {
    isLoading,
    data: { accounts, sites },
  } = useCachedPromise(
    async () => {
      const accounts = await service.listAccounts();
      // load zones of each account simultaneously
      const sites: Record<string, Zone[]> = {};
      const zoneRequests = accounts.map(async (account) => {
        const zones = await service.listZones(account);
        sites[account.id] = zones;
      });
      await Promise.all(zoneRequests);
      return {
        accounts,
        sites,
      };
    },
    [],
    {
      initialData: {
        accounts: [],
        sites: [],
      },
      onError: handleNetworkError,
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !Object.keys(sites).length && (
        <List.EmptyView
          icon="no-sites.svg"
          title="Add your website or application to Cloudflare"
          description="Connect your domain to start sending web traffic through Cloudflare."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://dash.cloudflare.com/" />
            </ActionPanel>
          }
        />
      )}
      {Object.entries(sites)
        .filter((entry) => entry[1].length > 0)
        .map((entry) => {
          const [accountId, accountSites] = entry;
          const account = accounts.find((account) => account.id === accountId);
          const name = account?.name || '';
          return (
            <List.Section title={name} key={accountId}>
              {accountSites.map((site) => (
                <List.Item
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          icon={Icon.Document}
                          title="Show Details"
                          target={
                            <SiteView accountId={accountId} id={site.id} />
                          }
                        />
                        <Action.Push
                          icon={Icon.List}
                          title="Show DNS Records"
                          target={<DnsRecordView siteId={site.id} />}
                        />
                        <Action.OpenInBrowser
                          title="Open on Cloudflare"
                          url={getSiteUrl(accountId, site.name)}
                          shortcut={{ modifiers: ['cmd'], key: 'o' }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.Push
                          icon={Icon.Hammer}
                          title="Purge Files From Cache by URL"
                          target={
                            <CachePurgeView
                              accountId={accountId}
                              id={site.id}
                            />
                          }
                          shortcut={{ modifiers: ['cmd', 'shift'], key: 'e' }}
                        />
                        <Action
                          icon={Icon.Hammer}
                          title="Purge Everything From Cache"
                          shortcut={{ modifiers: ['cmd'], key: 'e' }}
                          onAction={async () => {
                            purgeEverything(site);
                          }}
                        />
                        <Action
                          icon={Icon.ArrowClockwise}
                          title="Reload Sites From Cloudflare"
                          onAction={clearSiteCache}
                          shortcut={{ modifiers: ['cmd'], key: 'r' }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          icon={Icon.CopyClipboard}
                          content={site.name}
                          title="Copy Site URL"
                          shortcut={{ modifiers: ['cmd'], key: '.' }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                  icon={getSiteStatusIcon(site.status)}
                  key={site.id}
                  title={site.name}
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

export interface SiteProps {
  accountId: string;
  id: string;
}

function SiteView(props: SiteProps) {
  const { accountId, id } = props;

  const { isLoading, data: site } = useCachedPromise(
    async () => service.getZone(id),
    [],
    {
      onError: handleNetworkError,
    },
  );

  if (!site) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  const markdown = `
  # Site

  ## Name

  ${site.name}

  ## Status

  ${site.status}

  ## Name servers

  ${site.name_servers.map((server) => `* ${server}`).join('\n\n')}
  `;
  return (
    <Detail
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.List}
              title="Show DNS Records"
              target={<DnsRecordView siteId={site.id} />}
            />
            <Action.OpenInBrowser
              title="Open on Cloudflare"
              url={getSiteUrl(accountId, site.name)}
              shortcut={{ modifiers: ['cmd'], key: 'o' }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              content={site.name}
              title="Copy Site URL"
              shortcut={{ modifiers: ['cmd'], key: '.' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Modified" text={site.modified_on} />
          <Detail.Metadata.Label title="Created" text={site.created_on} />
          <Detail.Metadata.Label title="Activated" text={site.activated_on} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Permissions">
            {site.permissions.map((permission) => (
              <Detail.Metadata.TagList.Item
                key={permission}
                text={permission}
              />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}

interface DnsRecordProps {
  siteId: string;
}

function DnsRecordView(props: DnsRecordProps) {
  const { siteId } = props;
  const { isLoading, data: records } = useCachedPromise(
    async () => await service.listDnsRecords(siteId),
    [],
    {
      initialData: [],
      onError: handleNetworkError,
    },
  );

  return (
    <List isLoading={isLoading}>
      {records.map((record, index) => (
        <List.Item
          key={index}
          title={record.name}
          subtitle={record.content}
          accessories={[{ text: record.type }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  icon={Icon.CopyClipboard}
                  content={record.name}
                  title="Copy Record Name"
                  shortcut={{ modifiers: ['cmd'], key: '.' }}
                />
                <Action.CopyToClipboard
                  icon={Icon.CopyClipboard}
                  content={record.content}
                  title="Copy Record Value"
                  shortcut={{ modifiers: ['cmd', 'shift'], key: '.' }}
                />
                <Action.CopyToClipboard
                  icon={Icon.CopyClipboard}
                  content={record.type}
                  title="Copy Record Type"
                  shortcut={{ modifiers: ['opt', 'shift'], key: '.' }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function clearSiteCache() {
  service.clearCache();
  showToast({
    style: Toast.Style.Success,
    title: 'Local site cache cleared',
  });
  popToRoot({ clearSearchBar: true });
}

export default Command;
