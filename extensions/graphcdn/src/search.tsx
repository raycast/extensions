import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getOrgs, getServices } from "./api";

export default function Command() {
  const { isLoading: isLoadingOrganizations, data: orgs } = useCachedPromise(
    async () => {
      const result = await getOrgs();
      return result.organizations.edges.map((edge) => edge.node);
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
      failureToastOptions: {
        title: "Could not fetch the GraphCDN organizations",
      },
    }
  );

  const { isLoading: isLoadingServices, data: services } = useCachedPromise(
    async () => {
      const allServices = (
        await Promise.all(
          orgs.map(async (org) => {
            const result = await getServices(org.slug);
            return result.organization.services.edges.map((service) => ({ ...service.node, org: org.slug }));
          })
        )
      ).flat();
      return allServices;
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
      execute: !!orgs.length,
      failureToastOptions: {
        title: "Could not fetch the GraphCDN services",
      },
    }
  );

  const isLoading = isLoadingOrganizations || isLoadingServices;

  return (
    <List isLoading={isLoading}>
      {orgs.map((org) => (
        <List.Section title={org.name} key={org.id}>
          {services
            .filter((service) => service.org === org.slug)
            .map((service) => (
              <List.Item
                key={service.name}
                icon={Icon.Dot}
                title={service.name}
                subtitle={service.cdnEndpoint}
                accessories={[{ text: `${(service.metrics.summary.cacheHitRate * 100).toFixed(2)}% Cache hit rate` }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      icon="command-icon.png"
                      title="Open Dashboard"
                      url={`https://stellate.co/app/org/${org.slug}/services/${service.name}`}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
