import {
  List,
  Icon,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getOrgs, getServices } from "./api";

export default function Command() {
  
  const { isLoading: isLoadingOrganizations, data: orgs } = useCachedPromise(
    async () => {
      const result = await getOrgs();
      return result.organizations.edges.map(edge => edge.node);
    }, [], {
      keepPreviousData: true,
      initialData: []
    }
  )

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
    }, [], {
      keepPreviousData: true,
      initialData: [],
      execute: !!orgs.length
    }
  )

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
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
