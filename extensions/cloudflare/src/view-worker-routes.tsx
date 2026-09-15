import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { handleNetworkError } from './utils';
import {
  ZoneResourceContext,
  ZoneResourcePicker,
} from './zone-resource-picker';

function WorkerRoutesView({ context }: { context: ZoneResourceContext }) {
  const { isLoading, data: routes = [] } = useCachedPromise(
    async () => getCloudflareService().listWorkerRoutes(context.zone.id),
    [],
    { onError: handleNetworkError },
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${context.zone.name} Worker Routes`}
      searchBarPlaceholder="Search Worker routes and scripts"
    >
      {!isLoading && routes.length === 0 && (
        <List.EmptyView
          icon={Icon.Link}
          title="No Worker Routes Found"
          description="No Workers are currently routed through this zone."
        />
      )}
      {routes.map((route) => (
        <List.Item
          key={route.id}
          icon={Icon.Link}
          title={route.pattern}
          subtitle={route.script ?? 'Route disabled'}
          accessories={route.script ? [{ tag: route.script }] : undefined}
          actions={
            <ActionPanel>
              {route.script && (
                <Action.CopyToClipboard
                  title="Copy Worker Name"
                  content={route.script}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Route Pattern"
                content={route.pattern}
              />
              <Action.CopyToClipboard
                title="Copy Route ID"
                content={route.id}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Command() {
  return (
    <ZoneResourcePicker
      actionTitle="Show Worker Routes"
      icon={Icon.Link}
      renderTarget={(context) => <WorkerRoutesView context={context} />}
    />
  );
}

export default withCloudflareAccessToken(Command);
