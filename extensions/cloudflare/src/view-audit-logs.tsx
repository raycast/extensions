import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { AuditLog } from './service';
import { handleNetworkError } from './utils';

type ResultFilter = 'all' | 'success' | 'failure';

function Command() {
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const {
    isLoading,
    data: logs = [],
    revalidate,
  } = useCachedPromise(
    async () => {
      const accounts = await getCloudflareService().listAccounts();
      const accountLogs = await Promise.all(
        accounts.map((account) =>
          getCloudflareService().listAuditLogs(account.id),
        ),
      );
      return accountLogs
        .flat()
        .sort(
          (a, b) =>
            new Date(b.action.time).getTime() -
            new Date(a.action.time).getTime(),
        );
    },
    [],
    { onError: handleNetworkError },
  );

  const filteredLogs = logs.filter(
    (log) => resultFilter === 'all' || log.action.result === resultFilter,
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search the last seven days of account activity"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Result"
          value={resultFilter}
          onChange={(value) => setResultFilter(value as ResultFilter)}
        >
          <List.Dropdown.Item title="All Results" value="all" />
          <List.Dropdown.Item title="Successful" value="success" />
          <List.Dropdown.Item title="Failed" value="failure" />
        </List.Dropdown>
      }
    >
      {!isLoading && filteredLogs.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Audit Logs Found"
          description="No matching account activity was recorded during the last seven days."
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                title="Reload Audit Logs"
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      )}
      {filteredLogs.map((log) => (
        <AuditLogItem key={`${log.account.id}-${log.id}`} log={log} />
      ))}
    </List>
  );
}

function AuditLogItem({ log }: { log: AuditLog }) {
  const actor = log.actor.email || log.actor.type || 'Cloudflare';
  const resource = log.zone?.name || log.resource?.type || log.resource?.id;

  return (
    <List.Item
      icon={
        log.action.result === 'success'
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red }
      }
      title={log.action.description}
      subtitle={actor}
      keywords={[
        log.account.name,
        log.action.type,
        log.action.result,
        log.actor.context ?? '',
        log.resource?.product ?? '',
        resource ?? '',
      ]}
      accessories={[
        ...(log.resource?.product ? [{ tag: log.resource.product }] : []),
        {
          date: new Date(log.action.time),
          tooltip: new Date(log.action.time).toLocaleString(),
        },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Action"
                text={log.action.description}
              />
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={log.action.type}
              />
              <List.Item.Detail.Metadata.TagList title="Result">
                <List.Item.Detail.Metadata.TagList.Item
                  text={log.action.result}
                  color={
                    log.action.result === 'success' ? Color.Green : Color.Red
                  }
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label
                title="Time"
                text={new Date(log.action.time).toLocaleString()}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Actor" text={actor} />
              <List.Item.Detail.Metadata.Label
                title="Context"
                text={log.actor.context || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Label
                title="IP Address"
                text={log.actor.ipAddress || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Account"
                text={log.account.name}
              />
              <List.Item.Detail.Metadata.Label
                title="Zone"
                text={log.zone?.name || 'None'}
              />
              <List.Item.Detail.Metadata.Label
                title="Product"
                text={log.resource?.product || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Label
                title="Resource"
                text={resource || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Request"
                text={
                  [log.raw?.method, log.raw?.uri].filter(Boolean).join(' ') ||
                  'Unknown'
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Status Code"
                text={log.raw?.statusCode?.toString() || 'Unknown'}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {log.raw?.uri && (
            <Action.CopyToClipboard
              title="Copy Request Path"
              content={log.raw.uri}
            />
          )}
          <Action.CopyToClipboard title="Copy Audit Log ID" content={log.id} />
        </ActionPanel>
      }
    />
  );
}

export default withCloudflareAccessToken(Command);
