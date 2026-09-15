import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { ReactNode } from 'react';
import { getCloudflareService } from './oauth';
import type { Zone } from './service';
import { getSiteStatusIcon, getSiteUrl, handleNetworkError } from './utils';

export interface ZoneResourceContext {
  accountId: string;
  accountName: string;
  zone: Zone;
}

interface ZoneResourcePickerProps {
  actionTitle: string;
  icon: Icon;
  renderTarget: (context: ZoneResourceContext) => ReactNode;
}

export function ZoneResourcePicker({
  actionTitle,
  icon,
  renderTarget,
}: ZoneResourcePickerProps) {
  const { isLoading, data: contexts = [] } = useCachedPromise(
    async () => {
      const accounts = await getCloudflareService().listAccounts();
      const groups = await Promise.all(
        accounts.map(async (account) =>
          (await getCloudflareService().listZones(account)).map((zone) => ({
            accountId: account.id,
            accountName: account.name,
            zone,
          })),
        ),
      );
      return groups.flat();
    },
    [],
    { onError: handleNetworkError },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Cloudflare zones">
      {!isLoading && contexts.length === 0 && (
        <List.EmptyView
          icon="no-sites.svg"
          title="No Zones Found"
          description="Connect a zone to Cloudflare to inspect this resource."
        />
      )}
      {contexts.map((context) => (
        <List.Item
          key={context.zone.id}
          icon={getSiteStatusIcon(context.zone.status)}
          title={context.zone.name}
          subtitle={context.accountName}
          accessories={[{ tag: context.zone.status }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={icon}
                title={actionTitle}
                target={renderTarget(context)}
              />
              <Action.OpenInBrowser
                title="Open on Cloudflare"
                url={getSiteUrl(context.accountId, context.zone.name)}
                shortcut={{ modifiers: ['cmd'], key: 'o' }}
              />
              <Action.CopyToClipboard
                title="Copy Zone ID"
                content={context.zone.id}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
