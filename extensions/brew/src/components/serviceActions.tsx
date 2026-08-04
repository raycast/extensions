/**
 * Action panel and status helpers for managing brew services.
 */

import { Action, ActionPanel, Color, Icon, Image, Keyboard } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { homedir } from "os";
import {
  ALL_SERVICES,
  applyServiceAction,
  brewServiceIsRunning,
  ensureError,
  runServiceCommand,
  SERVICE_ACTION_COPY,
  showActionToast,
  showBrewFailureToast,
  type Service,
  type ServiceAction,
} from "../utils";

export type ServicesMutate = MutatePromise<Service[], undefined>;

/** Map a service status to a list icon. */
export function serviceStatusIcon(status: string): Image.ImageLike {
  switch (status) {
    case "started":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "scheduled":
      return { source: Icon.Clock, tintColor: Color.Blue };
    case "stopped":
    case "none":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    case "error":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.QuestionMarkCircle, tintColor: Color.Orange };
  }
}

/**
 * Run a service action with an optimistic list update, showing progress.
 *
 * The list flips to the expected state immediately via `mutate`, then
 * reconciles against a fresh `brew services list` in the background.
 */
async function runServiceAction(action: ServiceAction, name: string, mutate: ServicesMutate): Promise<void> {
  const copy = SERVICE_ACTION_COPY[action];
  const target = name === ALL_SERVICES ? "all services" : name;

  const run = () =>
    mutate(runServiceCommand(action, name), {
      optimisticUpdate: (services) => applyServiceAction(services ?? [], action, name),
    });

  const toast = showActionToast({ title: `${copy.gerund} ${target}`, cancelable: false });
  try {
    await run();
    await toast.showSuccessHUD(`${copy.past} ${target}`);
  } catch (err) {
    toast.hide();
    await showBrewFailureToast(`Failed to ${copy.verb.toLowerCase()} ${target}`, ensureError(err), {
      retryAction: run,
    });
  }
}

function ServiceActionItem(props: {
  action: ServiceAction;
  name: string;
  icon: Image.ImageLike;
  shortcut?: Keyboard.Shortcut;
  mutate: ServicesMutate;
}) {
  const { action, name } = props;
  const isAll = name === ALL_SERVICES;
  const title = isAll
    ? `${SERVICE_ACTION_COPY[action].verb} All Services`
    : `${SERVICE_ACTION_COPY[action].verb} Service`;
  return (
    <Action
      title={title}
      icon={props.icon}
      shortcut={props.shortcut}
      style={action === "stop" ? Action.Style.Destructive : undefined}
      onAction={() => runServiceAction(action, name, props.mutate)}
    />
  );
}

function AllServicesSection(props: { mutate: ServicesMutate }) {
  return (
    <ActionPanel.Section title="All Services">
      <ServiceActionItem
        action="start"
        name={ALL_SERVICES}
        icon={Icon.Play}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        mutate={props.mutate}
      />
      <ServiceActionItem
        action="stop"
        name={ALL_SERVICES}
        icon={Icon.Stop}
        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
        mutate={props.mutate}
      />
      <ServiceActionItem
        action="restart"
        name={ALL_SERVICES}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        mutate={props.mutate}
      />
    </ActionPanel.Section>
  );
}

function PlistSection(props: { file: string }) {
  const path = props.file.replace(/^~/, homedir());
  return (
    <ActionPanel.Section title="Plist">
      <Action.ShowInFinder title="Show Plist in Finder" path={path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
      <Action.OpenWith title="Open Plist with" path={path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
      <Action.CopyToClipboard title="Copy Plist Path" content={path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
    </ActionPanel.Section>
  );
}

export function ServiceActionPanel(props: { service: Service; mutate: ServicesMutate; revalidate: () => void }) {
  const { service, mutate, revalidate } = props;
  const running = brewServiceIsRunning(service);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Service">
        {running ? (
          <ServiceActionItem action="stop" name={service.name} icon={Icon.Stop} mutate={mutate} />
        ) : (
          <ServiceActionItem action="start" name={service.name} icon={Icon.Play} mutate={mutate} />
        )}
        <ServiceActionItem action="restart" name={service.name} icon={Icon.ArrowClockwise} mutate={mutate} />
      </ActionPanel.Section>
      <AllServicesSection mutate={mutate} />
      {service.file ? <PlistSection file={service.file} /> : null}
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
