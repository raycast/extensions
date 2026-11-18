import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';
import {
  canEditDnsRecord,
  DuplicateDnsRecordView,
  EditDnsRecordView,
} from './dns-record-form';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { DnsRecord, Zone } from './service';
import { getSiteUrl, handleNetworkError } from './utils';

interface ZoneContext {
  accountId: string;
  accountName: string;
  zone: Zone;
}

interface SearchResult {
  accountId: string;
  accountName: string;
  zone: Zone;
  record: DnsRecord;
}

function Command() {
  const [searchText, setSearchText] = useState('');
  const query = searchText.trim();

  const { isLoading: isLoadingZones, data: zones = [] } = useCachedPromise(
    async () => {
      const accounts = await getCloudflareService().listAccounts();
      const accountZones = await Promise.all(
        accounts.map(async (account) => {
          const zones = await getCloudflareService().listZones(account);
          return zones.map((zone) => ({
            accountId: account.id,
            accountName: account.name,
            zone,
          }));
        }),
      );
      return accountZones.flat();
    },
    [],
    { onError: handleNetworkError },
  );

  const {
    isLoading: isSearching,
    data: results = [],
    revalidate,
  } = useCachedPromise(
    async (query: string, zones: ZoneContext[]) => {
      const records = await Promise.all(
        zones.map(async ({ accountId, accountName, zone }) => {
          const matches = await getCloudflareService().searchDnsRecords(
            zone.id,
            query,
          );
          return matches.map((record) => ({
            accountId,
            accountName,
            zone,
            record,
          }));
        }),
      );
      return records.flat();
    },
    [query, zones],
    {
      execute: query.length >= 2 && zones.length > 0,
      keepPreviousData: true,
      onError: handleNetworkError,
    },
  );

  return (
    <List
      isLoading={isLoadingZones || isSearching}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search record name, content, or type"
      throttle
    >
      {query.length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search DNS Records"
          description="Enter at least two characters to search across all accessible zones."
        />
      ) : (
        results.map((result) => (
          <DnsRecordItem
            key={`${result.zone.id}-${result.record.id}`}
            result={result}
            onChange={revalidate}
          />
        ))
      )}
    </List>
  );
}

function DnsRecordItem({
  result,
  onChange,
}: {
  result: SearchResult;
  onChange: () => void;
}) {
  const { accountId, accountName, zone, record } = result;

  const deleteRecord = async () => {
    const confirmed = await confirmAlert({
      title: 'Delete DNS Record?',
      message: `${record.type} ${record.name} will be permanently deleted.`,
      primaryAction: {
        title: 'Delete',
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: 'Deleting DNS Record',
    });
    try {
      await getCloudflareService().deleteDnsRecord(zone.id, record.id);
      toast.style = Toast.Style.Success;
      toast.title = 'Deleted DNS Record';
      onChange();
    } catch (error) {
      await toast.hide();
      await handleNetworkError(error);
    }
  };

  return (
    <List.Item
      icon={Icon.Network}
      title={record.name}
      subtitle={record.content}
      keywords={[record.type, zone.name, accountName, ...(record.tags ?? [])]}
      accessories={[
        { tag: record.type },
        { text: zone.name, tooltip: accountName },
      ]}
      actions={
        <ActionPanel>
          {canEditDnsRecord(record) && (
            <Action.Push
              icon={Icon.Pencil}
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Edit DNS Record"
              target={
                <EditDnsRecordView
                  zoneId={zone.id}
                  record={record}
                  onSave={onChange}
                />
              }
            />
          )}
          <Action.Push
            icon={Icon.Duplicate}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Duplicate DNS Record"
            target={
              <DuplicateDnsRecordView
                zoneId={zone.id}
                record={record}
                onCreate={onChange}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open Zone on Cloudflare"
            url={`${getSiteUrl(accountId, zone.name)}/dns/records`}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Record Value"
              content={record.content}
            />
            <Action.CopyToClipboard
              title="Copy Record Name"
              content={record.name}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Delete DNS Record"
              style={Action.Style.Destructive}
              onAction={deleteRecord}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default withCloudflareAccessToken(Command);
