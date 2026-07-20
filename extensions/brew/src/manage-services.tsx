/**
 * Manage Services view for starting, stopping and restarting brew services.
 */

import { Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { brewServiceIsRunning, type Service } from "./utils";
import { useBrewServices } from "./hooks/useBrewServices";
import { ServiceActionPanel, serviceStatusIcon, type ServicesMutate } from "./components/serviceActions";
import { ErrorBoundary } from "./components/ErrorBoundary";

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function ServiceListItem(props: { service: Service; mutate: ServicesMutate; revalidate: () => void }) {
  const { service } = props;
  const accessories: List.Item.Accessory[] = [];
  if (service.user) {
    accessories.push({ icon: Icon.Person, text: service.user, tooltip: `Running as ${service.user}` });
  }

  return (
    <List.Item
      id={service.name}
      title={service.name}
      subtitle={statusLabel(service.status)}
      icon={serviceStatusIcon(service.status)}
      accessories={accessories}
      keywords={[service.status]}
      actions={<ServiceActionPanel service={service} mutate={props.mutate} revalidate={props.revalidate} />}
    />
  );
}

function ManageServicesContent() {
  const { isLoading, data, revalidate, mutate } = useBrewServices();

  const services = data ?? [];
  const running = services.filter(brewServiceIsRunning);
  const stopped = services.filter((service) => !brewServiceIsRunning(service));

  return (
    <List isLoading={isLoading} searchBarPlaceholder={isLoading ? "Loading services…" : "Search services…"}>
      {isLoading && !data && (
        <List.EmptyView
          icon={getProgressIcon(0.5)}
          title="Loading services…"
          description="Running brew services list"
        />
      )}

      {!isLoading && services.length === 0 && data !== undefined && (
        <List.EmptyView
          icon={Icon.Gear}
          title="No services found"
          description="No Homebrew formulae provide services on this system."
        />
      )}

      <List.Section title="Running" subtitle={running.length > 0 ? `${running.length}` : undefined}>
        {running.map((service) => (
          <ServiceListItem key={service.name} service={service} mutate={mutate} revalidate={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Stopped" subtitle={stopped.length > 0 ? `${stopped.length}` : undefined}>
        {stopped.map((service) => (
          <ServiceListItem key={service.name} service={service} mutate={mutate} revalidate={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}

export default function Main() {
  return (
    <ErrorBoundary>
      <ManageServicesContent />
    </ErrorBoundary>
  );
}
