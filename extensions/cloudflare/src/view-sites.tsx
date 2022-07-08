import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from '@raycast/api';
import { useEffect, useState } from 'react';

import Service, { Account, DnsRecord, Zone } from './service';
import {
  getEmail,
  getKey,
  getSiteStatusIcon,
  getSiteUrl,
  handleNetworkError,
} from './utils';

const service = new Service(getEmail(), getKey());

function Command() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sites, setSites] = useState<Record<string, Zone[]>>({});
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSites() {
      try {
        const accounts = await service.listAccounts();
        setAccounts(accounts);

        const sites: Record<string, Zone[]> = {};
        for (let i = 0; i < accounts.length; i++) {
          const account = accounts[i];
          const accountSites = await service.listZones(account);
          sites[account.id] = accountSites;
        }
        setSites(sites);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchSites();
  }, []);

  return (
    <List isLoading={isLoading}>
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
                      <Action.Push
                        icon={Icon.TextDocument}
                        title="Show Details"
                        target={<SiteView accountId={accountId} id={site.id} />}
                      />
                      <Action.Push
                        icon={Icon.List}
                        title="Show DNS Records"
                        target={<DnsRecordView siteId={site.id} />}
                      />
                      <Action.Push
                        icon={Icon.Hammer}
                        title="Purge Files from Cache by URL"
                        target={
                          <CachePurgeView accountId={accountId} id={site.id} />
                        }
                        shortcut={{ modifiers: ['cmd'], key: 'p' }}
                      />
                      <Action
                        icon={Icon.Hammer}
                        title="Purge Everything from Cache"
                        shortcut={{ modifiers: ['cmd'], key: 'e' }}
                        onAction={async () => { purgeEverything(site) }}
                      ></Action>
                      <Action.OpenInBrowser
                        title="Open on Cloudflare"
                        url={getSiteUrl(accountId, site.name)}
                        shortcut={{ modifiers: ['cmd'], key: 'f' }}
                      />
                      <Action
                        icon={Icon.ArrowClockwise}
                        title="Reload sites from Cloudflare"
                        onAction={clearSiteCache}
                      />
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

interface SiteProps {
  accountId: string;
  id: string;
}

function SiteView(props: SiteProps) {
  const { accountId, id } = props;

  const [site, setSite] = useState<Zone | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSite() {
      try {
        const site = await service.getZone(id);
        setSite(site);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchSite();
  }, []);

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

  ${site.nameServers.map((server) => `* ${server}`).join('\n\n')}
  `;
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.List}
            title="Show DNS Records"
            target={<DnsRecordView siteId={site.id} />}
          />
          <Action.OpenInBrowser
            title="Open on Cloudflare"
            url={getSiteUrl(accountId, site.name)}
            shortcut={{ modifiers: ['cmd'], key: 'f' }}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
    />
  );
}

interface DnsRecordProps {
  siteId: string;
}

function DnsRecordView(props: DnsRecordProps) {
  const { siteId } = props;

  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecords() {
      try {
        const records = await service.listDnsRecords(siteId);
        setRecords(records);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchRecords();
  });

  return (
    <List isLoading={isLoading}>
      {records.map((record, index) => (
        <List.Item
          key={index}
          title={record.name}
          subtitle={record.content}
          accessoryTitle={record.type}
        />
      ))}
    </List>
  );
}

function CachePurgeView(props: SiteProps) {
  const { id } = props;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Purge Files"
            onSubmit={(values) => clearUrlsFromCache(id, values.urls)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="urls"
        title="List of URL(s)"
        placeholder="Separate URL(s) one per line"
      />
    </Form>
  );
}

async function clearUrlsFromCache(zoneId: string, urls: string) {
  if (
    !(await confirmAlert({
      title: 'Do you really want to purge the files from cache?',
      primaryAction: { title: 'Purge', style: Alert.ActionStyle.Destructive },
    }))
  ) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: 'Purging URL(s)',
  });

  // Split URLs by newline
  const urlList = urls.split('\n');

  const result = await service.purgeFilesbyURL(zoneId, urlList);

  if (result.success) {
    toast.style = Toast.Style.Success;
    toast.title = 'URL(s) purged';
    return;
  }

  toast.style = Toast.Style.Failure;
  toast.title = 'Failed to purge URL(s)';
  if (result.errors.length > 0) {
    toast.message = result.errors[0].message;
  }
}

async function purgeEverything(zone: Zone) {
  if (!await confirmAlert({
    title: "Do you really want to purge everything from cache for " + zone.name + "?",
    primaryAction: { title: "Purge", style: Alert.ActionStyle.Destructive }
  })) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Purging cache",
  });

  const result = await service.purgeEverything(zone.id);

  if (result.success) {
    toast.style = Toast.Style.Success;
    toast.title = "Cache purged";
    return;
  }

  toast.style = Toast.Style.Failure;
  toast.title = "Failed to purge cache";
  if (result.errors.length > 0) {
    toast.message = result.errors[0].message;
  }
}

async function clearSiteCache() {
  service.clearCache();
  showToast({
    style: Toast.Style.Success,
    title: "Local site cache cleared",
  });
  popToRoot({ clearSearchBar: true });
}

export default Command;
