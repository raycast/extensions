import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast, Keyboard } from "@raycast/api";
import { listAllServices, listServiceLinks, supportsLinks } from "./api";
import { signOut } from "./oauth";
import type { Organization, Service, ServiceLink } from "./types";

const ALL_ORGANIZATIONS = "all";

function formatServiceName(name: string): string {
  return name.length === 0 ? name : `${name[0].toUpperCase()}${name.slice(1).toLowerCase()}`;
}

function serviceConsoleUrl(service: Service): string {
  return `https://console.qovery.com/organization/${service.organization_id}/project/${service.project_id}/environment/${service.environment_id}/service/${service.id}/overview`;
}

function serviceIcon(service: Service) {
  if (service.icon_uri) {
    return { source: service.icon_uri, fallback: Icon.Box };
  }

  const icons: Record<string, Icon> = {
    application: Icon.Code,
    container: Icon.Box,
    database: Icon.HardDrive,
    helm: Icon.Layers,
    job: Icon.Clock,
  };
  return { source: icons[service.service_type.toLowerCase()] ?? Icon.Box, tintColor: Color.PrimaryText };
}

function LinksView({ service }: { service: Service }) {
  const [links, setLinks] = useState<ServiceLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void listServiceLinks(service)
      .then((result) => {
        if (!cancelled) setLinks(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load service links");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [service]);

  return (
    <List isLoading={isLoading} navigationTitle={`${formatServiceName(service.name)} Links`}>
      {!isLoading && links.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.Link}
          title={error ? "Unable to Load Links" : "No Links Found"}
          description={error || "This service has no configured links"}
        />
      ) : null}
      {links.map((link) => (
        <List.Item
          key={link.url}
          icon={Icon.Link}
          title={link.url}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Link" url={link.url} />
              <Action.CopyToClipboard title="Copy Link" content={link.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [services, setServices] = useState<Service[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState(ALL_ORGANIZATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const loadGeneration = useRef(0);

  const loadServices = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await listAllServices();
      if (generation !== loadGeneration.current) return;

      setOrganizations(result.organizations);
      setServices(result.services);

      if (result.failedOrganizations.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Some organizations could not be loaded",
          message: result.failedOrganizations.map((organization) => organization.name).join(", "),
        });
      }
    } catch (reason) {
      if (generation !== loadGeneration.current) return;

      const message = reason instanceof Error ? reason.message : "Unable to load your Qovery services";
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Unable to Load Qovery", message });
    } finally {
      if (generation === loadGeneration.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadServices();
    return () => {
      loadGeneration.current += 1;
    };
  }, [loadServices]);

  const visibleServices = useMemo(
    () =>
      selectedOrganization === ALL_ORGANIZATIONS
        ? services
        : services.filter((service) => service.organization_id === selectedOrganization),
    [selectedOrganization, services],
  );

  const logout = useCallback(async () => {
    loadGeneration.current += 1;
    await signOut();
    setServices([]);
    setOrganizations([]);
    setSelectedOrganization(ALL_ORGANIZATIONS);
    setError(undefined);
    setIsLoading(false);
    await showToast({ style: Toast.Style.Success, title: "Signed Out of Qovery" });
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search anything..."
      searchBarAccessory={
        organizations.length > 1 ? (
          <List.Dropdown
            tooltip="Filter by Organization"
            value={selectedOrganization}
            onChange={setSelectedOrganization}
          >
            <List.Dropdown.Item title={`All Organizations (${organizations.length})`} value={ALL_ORGANIZATIONS} />
            {organizations.map((organization) => (
              <List.Dropdown.Item key={organization.id} title={organization.name} value={organization.id} />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      {!isLoading && visibleServices.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.MagnifyingGlass}
          title={error ? "Unable to Load Services" : "No Services Found"}
          description={error || "No services are available in the selected organization"}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={loadServices} />
              <Action title="Sign out" icon={Icon.Logout} onAction={logout} />
            </ActionPanel>
          }
        />
      ) : null}
      {visibleServices.map((service) => (
        <List.Item
          key={`${service.organization_id}:${service.id}`}
          icon={serviceIcon(service)}
          title={formatServiceName(service.name)}
          subtitle={`${service.project_name} · ${service.environment_name}`}
          keywords={[service.organization_name, service.project_name, service.environment_name, service.service_type]}
          accessories={[
            { tag: { value: service.service_type, color: Color.SecondaryText } },
            ...(organizations.length > 1 ? [{ text: service.organization_name }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Qovery Console" url={serviceConsoleUrl(service)} />
              {supportsLinks(service) ? (
                <Action.Push
                  title="View Service Links"
                  icon={Icon.Link}
                  target={<LinksView service={service} />}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
              ) : null}
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy Service ID" content={service.id} />
                <Action.CopyToClipboard title="Copy Service Name" content={service.name} />
                <Action.CopyToClipboard title="Copy Project ID" content={service.project_id} />
                <Action.CopyToClipboard title="Copy Environment ID" content={service.environment_id} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh Services"
                  icon={Icon.RotateClockwise}
                  onAction={loadServices}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
                <Action title="Sign out" icon={Icon.Logout} onAction={logout} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
