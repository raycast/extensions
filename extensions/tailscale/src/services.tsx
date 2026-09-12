import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { type ErrorDetails, getErrorDetails, getServices, type Service } from "./shared";

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
        services?.map((service) => (
          <List.Item
            key={`${service.hostname}-${service.ip}-${service.endpoints}`}
            icon={Icon.Globe}
            title={service.displayName ?? service.hostname}
            subtitle={service.displayName ? service.hostname : service.ip}
            accessories={[{ text: service.endpoints }, { tag: service.type }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Service" url={`https://${service.hostname}`} />
                <Action.CopyToClipboard title="Copy Hostname" content={service.hostname} />
                <Action.CopyToClipboard title="Copy IP Address" content={service.ip} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
