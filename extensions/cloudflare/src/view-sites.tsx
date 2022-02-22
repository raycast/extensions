import { Action, ActionPanel, Detail, Icon, List } from '@raycast/api';
import { useEffect, useState } from 'react';

import Service, { DnsRecord, Zone } from './service';
import {
  getEmail,
  getKey,
  getSiteStatusIcon,
  getSiteUrl,
  handleNetworkError,
} from './utils';

const service = new Service(getEmail(), getKey());

function Command() {
  const [sites, setSites] = useState<Zone[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSites() {
      try {
        const accounts = await service.listAccounts();
        if (accounts.length === 0) {
          setSites([]);
          setLoading(false);
        }
        const account = accounts[0];
        setAccountId(account.id);

        const sites = await service.listZones(account);
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
      {sites.map((site) => (
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
              <Action.OpenInBrowser
                title="Open on Cloudflare"
                url={getSiteUrl(accountId, site.name)}
                shortcut={{ modifiers: ['cmd'], key: 'f' }}
              />
            </ActionPanel>
          }
          icon={getSiteStatusIcon(site.status)}
          key={site.id}
          title={site.name}
        />
      ))}
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
      } catch(e) {
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

export default Command;
