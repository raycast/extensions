import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FastlyService } from "../types";
import { getServices, purgeCache, getServiceDomains } from "../api";
import { ServiceDetail } from "./service-detail";

interface ServiceWithDomains extends FastlyService {
  domains?: string[];
}

// Move helper function outside of component
function getDashboardUrl(service: FastlyService) {
  const baseUrl = "https://manage.fastly.com";
  if (service.type?.toLowerCase() === "wasm") {
    return `${baseUrl}/compute/services/${service.id}`;
  }
  return `${baseUrl}/configure/services/${service.id}`;
}

export function ServiceList() {
  const [services, setServices] = useState<ServiceWithDomains[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredServices, setFilteredServices] = useState<ServiceWithDomains[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    filterServices(searchText);
  }, [services, searchText]);

  async function loadServices() {
    try {
      setIsLoading(true);
      const servicesData = await getServices();

      const servicesWithDomains = await Promise.all(
        servicesData.map(async (service) => {
          try {
            const domains = await getServiceDomains(service.id /* version not needed */);
            return {
              ...service,
              domains,
            };
          } catch (error) {
            console.error(`Failed to fetch domains for service ${service.id}:`, error);
            return { ...service, domains: [] };
          }
        }),
      );

      setServices(servicesWithDomains);
      setFilteredServices(servicesWithDomains);
    } catch (error) {
      console.error("Error loading services:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load services",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function filterServices(query: string) {
    if (!query) {
      setFilteredServices(services);
      return;
    }

    const searchLower = query.toLowerCase();
    const filtered = services.filter((service) => {
      const nameMatch = service.name.toLowerCase().includes(searchLower);
      const domainMatch = service.domains?.some((domain) => domain?.toLowerCase().includes(searchLower));
      return nameMatch || domainMatch;
    });

    setFilteredServices(filtered);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search services by name or domain..."
      onSearchTextChange={setSearchText}
    >
      {filteredServices.map((service) => (
        <List.Item
          key={service.id}
          title={service.name}
          subtitle={
            service.domains && service.domains.length > 0 ? service.domains.join(", ") : "No domains configured"
          }
          accessories={[
            {
              text: service.type === "wasm" ? "Compute" : "CDN",
              icon: service.type === "wasm" ? Icon.Terminal : Icon.Globe,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push title="Show Details" target={<ServiceDetail service={service} />} icon={Icon.Sidebar} />
                <Action.OpenInBrowser title="Open in Control Panel" url={getDashboardUrl(service)} />
              </ActionPanel.Section>

              <ActionPanel.Section title="Service Actions">
                <Action
                  title="Purge Cache"
                  icon={Icon.Trash}
                  onAction={async () => {
                    try {
                      await purgeCache(service.id);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Cache purged successfully",
                      });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to purge cache",
                        message: error instanceof Error ? error.message : "Unknown error",
                      });
                    }
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                <Action.OpenInBrowser
                  title="View Real-time Stats"
                  url={`https://manage.fastly.com/observability/dashboard/system/overview/realtime/${service.id}`}
                  icon={Icon.BarChart}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
                <Action.OpenInBrowser
                  title="View Service Logs"
                  url={`https://manage.fastly.com/observability/logs/explorer/${service.id}`}
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Quick Access">
                <Action
                  title="Refresh List"
                  icon={Icon.ArrowClockwise}
                  onAction={loadServices}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
