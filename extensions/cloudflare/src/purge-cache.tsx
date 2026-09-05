import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { Zone } from './service';
import { getSiteStatusIcon, handleNetworkError } from './utils';
import { CachePurgeView, purgeEverything } from './view-cache-purge';

function Command() {
  const { isLoading, data: sites } = useCachedPromise(
    async () => {
      const accounts = await getCloudflareService().listAccounts();
      const sites = await Promise.all(
        accounts.map(async (account) => ({
          account,
          zones: await getCloudflareService().listZones(account),
        })),
      );
      return sites;
    },
    [],
    {
      initialData: [],
      onError: handleNetworkError,
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a zone to purge">
      {!isLoading && sites.every(({ zones }) => zones.length === 0) && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Zones Found"
          description="No accessible Cloudflare zones are available."
        />
      )}
      {sites.map(({ account, zones }) => (
        <List.Section title={account.name} key={account.id}>
          {zones.map((zone) => (
            <ZoneItem key={zone.id} accountId={account.id} zone={zone} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ZoneItem({ accountId, zone }: { accountId: string; zone: Zone }) {
  return (
    <List.Item
      icon={getSiteStatusIcon(zone.status)}
      title={zone.name}
      accessories={[{ text: zone.status }]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Hammer}
            title="Purge Cache"
            target={<CachePurgeView accountId={accountId} id={zone.id} />}
          />
          <Action
            icon={Icon.Trash}
            title="Purge Everything from Cache"
            style={Action.Style.Destructive}
            onAction={() => purgeEverything(zone)}
          />
        </ActionPanel>
      }
    />
  );
}

export default withCloudflareAccessToken(Command);
