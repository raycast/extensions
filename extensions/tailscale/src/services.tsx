import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { type ErrorDetails, getErrorDetails, getServices, type Service } from "./shared";

function getBrowserUrl(service: Service): string | undefined {
  const ports = service.ports.map((endpoint) => Number(endpoint.split(":").at(-1))).filter(Number.isInteger);
  const isWebService = service.type === "http" || service.type === "https";

  if (service.type && !isWebService) return undefined;

  const port = isWebService ? ports[0] : ports.find((port) => port === 80 || port === 443);
  if (!port) return undefined;

  const protocol = service.type ?? (port === 443 ? "https" : "http");
  const portSuffix = port === 80 || port === 443 ? "" : `:${port}`;
  return `${protocol}://${service.hostname}${portSuffix}`;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>();
  const [error, setError] = useState<ErrorDetails>();

  useEffect(() => {
    try {
      setServices(getServices());
    } catch (err) {
      setError(getErrorDetails(err, "Couldn’t load services."));
    }
  }, []);

  return (
    <List isLoading={!services && !error} searchBarPlaceholder="Search services...">
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={error.title} description={error.description} />
      ) : services?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Services Found"
          description="No services are available in your tailnet."
        />
      ) : (
        services?.map((service) => {
          const browserUrl = getBrowserUrl(service);
          const ipAddress = service.addresses.find((address) => !address.includes(":")) ?? service.addresses[0];

          return (
            <List.Item
              key={service.name}
              icon={Icon.Globe}
              title={service.displayName ?? service.name}
              subtitle={service.hostname}
              accessories={[{ text: service.ports.join(", ") }, ...(service.type ? [{ tag: service.type }] : [])]}
              actions={
                <ActionPanel>
                  {browserUrl && <Action.OpenInBrowser title="Open Service" url={browserUrl} />}
                  <Action.CopyToClipboard title="Copy Hostname" content={service.hostname} />
                  {ipAddress && <Action.CopyToClipboard title="Copy IP Address" content={ipAddress} />}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
