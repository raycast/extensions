import { useFetch } from "@raycast/utils";
import { API_URL, headers, parseResponse } from "./koyeb";
import { Color, Icon, Image, List } from "@raycast/api";
import { App, Service, ServiceType } from "./types";

const SERVICE_TYPE_ICONS: Partial<Record<ServiceType, Image>> = {
  WEB: { source: Icon.CodeBlock, tintColor: Color.Green },
};

export default function ListApps() {
  const { isLoading: isLoadingApps, data: apps } = useFetch(API_URL + "apps", {
    headers,
    parseResponse,
    mapResult(result: { apps: App[] }) {
      return {
        data: result.apps,
      };
    },
    initialData: [],
  });
  const { isLoading: isLoadingServices, data: services } = useFetch(API_URL + "services", {
    headers,
    parseResponse,
    mapResult(result: { services: Service[] }) {
      return {
        data: result.services,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoadingApps || isLoadingServices} isShowingDetail>
      {apps.map((app) => (
        <List.Section key={app.id} title={app.name}>
          {services
            .filter((service) => service.app_id === app.id)
            .map((service) => (
              <List.Item
                key={service.id}
                icon={SERVICE_TYPE_ICONS[service.type]}
                title={service.name}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Type">
                          <List.Item.Detail.Metadata.TagList.Item text={service.type} />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Link
                          title="Domain"
                          text={app.domains[0].name}
                          target={`https://${app.domains[0].name}`}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
