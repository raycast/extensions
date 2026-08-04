/**
 * Menu bar command for quickly controlling brew services.
 *
 * Homebrew has no way to notify us when a service's state changes, so the menu
 * is kept fresh by polling on the command's `interval` (configurable in the
 * command preferences) and by an optimistic `mutate` after each action.
 */

import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import {
  ALL_SERVICES,
  applyServiceAction,
  brewServiceIsRunning,
  ensureError,
  getErrorMessage,
  runServiceCommand,
  SERVICE_ACTION_COPY,
  type Service,
  type ServiceAction,
} from "./utils";
import { useBrewServices } from "./hooks/useBrewServices";
import { serviceStatusIcon, type ServicesMutate } from "./components/serviceActions";

const MENU_ICON = { source: "services-menubar.svg", tintColor: Color.PrimaryText };

const ACTION_ICONS: Record<ServiceAction, Icon> = {
  start: Icon.Play,
  stop: Icon.Stop,
  restart: Icon.ArrowClockwise,
};

async function handleAction(action: ServiceAction, name: string, mutate: ServicesMutate) {
  const copy = SERVICE_ACTION_COPY[action];
  const target = name === ALL_SERVICES ? "all services" : name;
  try {
    await mutate(runServiceCommand(action, name), {
      optimisticUpdate: (services) => applyServiceAction(services ?? [], action, name),
    });
    await showHUD(`${copy.past} ${target}`);
  } catch (err) {
    await showHUD(`Failed to ${copy.verb.toLowerCase()} ${target}: ${getErrorMessage(ensureError(err))}`);
  }
}

export default function Command() {
  const { isLoading, data, revalidate, mutate } = useBrewServices();

  const services = data ?? [];
  const running = services.filter(brewServiceIsRunning);

  return (
    <MenuBarExtra
      icon={MENU_ICON}
      title={running.length > 0 ? `${running.length}` : undefined}
      tooltip="Homebrew Services"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="All Services">
        <MenuBarExtra.Item
          title="Start All"
          icon={ACTION_ICONS.start}
          onAction={() => handleAction("start", ALL_SERVICES, mutate)}
        />
        <MenuBarExtra.Item
          title="Stop All"
          icon={ACTION_ICONS.stop}
          onAction={() => handleAction("stop", ALL_SERVICES, mutate)}
        />
        <MenuBarExtra.Item
          title="Restart All"
          icon={ACTION_ICONS.restart}
          onAction={() => handleAction("restart", ALL_SERVICES, mutate)}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Services">
        {services.map((service) => (
          <ServiceSubmenu key={service.name} service={service} mutate={mutate} />
        ))}
        {!isLoading && services.length === 0 && <MenuBarExtra.Item title="No services found" />}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Manage Services"
          icon={Icon.AppWindowList}
          onAction={() => launchCommand({ name: "manage-services", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function ServiceSubmenu(props: { service: Service; mutate: ServicesMutate }) {
  const { service, mutate } = props;
  const running = brewServiceIsRunning(service);

  return (
    <MenuBarExtra.Submenu title={service.name} icon={serviceStatusIcon(service.status)}>
      {running ? (
        <MenuBarExtra.Item
          title="Stop"
          icon={ACTION_ICONS.stop}
          onAction={() => handleAction("stop", service.name, mutate)}
        />
      ) : (
        <MenuBarExtra.Item
          title="Start"
          icon={ACTION_ICONS.start}
          onAction={() => handleAction("start", service.name, mutate)}
        />
      )}
      <MenuBarExtra.Item
        title="Restart"
        icon={ACTION_ICONS.restart}
        onAction={() => handleAction("restart", service.name, mutate)}
      />
    </MenuBarExtra.Submenu>
  );
}
