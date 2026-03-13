import { ActionPanel, Action, List, getPreferenceValues, Icon, environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import getHomepageIcon from "./utils/getHomepageIcon";

interface Preferences {
  homepageUrl: string;
}

interface Service {
  name: string;
  icon?: string;
  href?: string;
  description?: string;
  widget?: Widget | undefined; // Add a default value of undefined
  type?: string;
  weight?: number;
}

interface ServiceGroup {
  name: string;
  icon?: string;
  services: Service[];
}

interface Widget {
  type: string;
  fields?: string[];
  hide_error?: boolean;
  service_name: string;
  service_group: string;
}

const preferences = getPreferenceValues<Preferences>();
const apiUrl = `${preferences.homepageUrl}/api`;

export default function Command() {
  const { data, isLoading } = useFetch(`${apiUrl}/services`) as { data: ServiceGroup[]; isLoading: boolean };
  return (
    <List isLoading={isLoading}>
      {data?.map((group: ServiceGroup) => {
        const { name, services } = group;

        return (
          <List.Section key={name} title={name} subtitle={services.length.toString()}>
            {services.map((service: Service) => {
              const { name, description, href, widget } = service;

              const icon = service.icon ? getHomepageIcon(service.icon) : Icon.SquareEllipsis;

              return (
                <List.Item
                  key={name}
                  id={name}
                  icon={icon}
                  title={name}
                  subtitle={description}
                  accessories={widget ? getWidgetAccessory(widget) : undefined}
                  actions={
                    <ActionPanel>
                      {href ? (
                        <Action.OpenInBrowser title={`Open ${name}`} url={href} icon={icon} />
                      ) : (
                        <Action.OpenInBrowser
                          title={`Open Homepage`}
                          url={preferences.homepageUrl}
                          icon={"homepage.png"}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

function getWidgetAccessory(widget: Widget): List.Item.Accessory[] | undefined {
  const { service_name: serviceName, service_group: serviceGroup } = widget;

  const urlParams = new URLSearchParams();
  urlParams.append("group", serviceGroup);
  urlParams.append("service", serviceName);

  switch (serviceName) {
    case "Sonarr": {
      urlParams.append(
        "query",
        JSON.stringify({
          start: "2024-03-15",
          end: "2024-09-15",
          unmonitored: false,
          includeSeries: "true",
          includeEpisodeFile: "false",
          includeEpisodeImages: "false",
        })
      );
      urlParams.append("endpoints", ["calendar"].join("/"));

      const widgetProxyUrl = `${apiUrl}/services/proxy?${urlParams.toString()}`;

      if (environment.isDevelopment) {
        console.log(widgetProxyUrl);

        // return [
        //   {
        //     tag: "Wanted",
        //   },
        //   {
        //     text: "763",
        //   },
        //   {
        //     tag: "Queued",
        //   },
        //   {
        //     text: "8",
        //   },
        //   {
        //     tag: "Series",
        //   },
        //   {
        //     text: "975",
        //   },
        // ];
      }

      return [];
    }
    default:
      return undefined;
  }
}
