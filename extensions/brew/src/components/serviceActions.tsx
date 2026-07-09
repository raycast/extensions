/**
 * Action panel and status helpers for managing brew services.
 */

import { Action, ActionPanel, Color, Icon, Image, Keyboard } from "@raycast/api";
import { homedir } from "os";
import {
  ALL_SERVICES,
  brewRestartService,
  brewServiceIsRunning,
  brewStartService,
  brewStopService,
  ensureError,
  findService,
  brewFetchServices,
  showActionToast,
  showBrewFailureToast,
  type Service,
} from "../utils";

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

type ServiceAction = "start" | "stop" | "restart";

interface ActionCopy {
  verb: string;
  gerund: string;
  past: string;
}

const COPY: Record<ServiceAction, ActionCopy> = {
  start: { verb: "Start", gerund: "Starting", past: "Started" },
  stop: { verb: "Stop", gerund: "Stopping", past: "Stopped" },
  restart: { verb: "Restart", gerund: "Restarting", past: "Restarted" },
};

const RUNNERS: Record<ServiceAction, (name: string, cancel?: AbortSignal) => Promise<void>> = {
  start: brewStartService,
  stop: brewStopService,
  restart: brewRestartService,
};

/**
 * Run a service action, showing progress and confirming the outcome.
 * Returns true on success so callers can refresh the list.
 */
async function runServiceAction(action: ServiceAction, name: string): Promise<boolean> {
  const copy = COPY[action];
  const target = name === ALL_SERVICES ? "all services" : name;
  const toast = showActionToast({ title: `${copy.gerund} ${target}`, cancelable: false });

  try {
    await RUNNERS[action](name);

    // For a single service, confirm the new state so we surface silent failures.
    if (name !== ALL_SERVICES) {
      const service = findService(await brewFetchServices(), name);
      if (service?.status === "error") {
        await toast.showFailureHUD(`Failed to ${copy.verb.toLowerCase()} ${name}`);
        return false;
      }
    }

    await toast.showSuccessHUD(`${copy.past} ${target}`);
    return true;
  } catch (err) {
    toast.hide();
    await showBrewFailureToast(`Failed to ${copy.verb.toLowerCase()} ${target}`, ensureError(err), {
      retryAction: async () => {
        await RUNNERS[action](name);
      },
    });
    return false;
  }
}

function ServiceActionItem(props: {
  action: ServiceAction;
  name: string;
  icon: Image.ImageLike;
  shortcut?: Keyboard.Shortcut;
  onAction: () => void;
}) {
  const { action, name } = props;
  const isAll = name === ALL_SERVICES;
  const title = isAll ? `${COPY[action].verb} All Services` : `${COPY[action].verb} Service`;
  return (
    <Action
      title={title}
      icon={props.icon}
      shortcut={props.shortcut}
      style={action === "stop" ? Action.Style.Destructive : undefined}
      onAction={async () => {
        const ok = await runServiceAction(action, name);
        if (ok) props.onAction();
      }}
    />
  );
}

function AllServicesSection(props: { onAction: () => void }) {
  return (
    <ActionPanel.Section title="All Services">
      <ServiceActionItem
        action="start"
        name={ALL_SERVICES}
        icon={Icon.Play}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        onAction={props.onAction}
      />
      <ServiceActionItem
        action="stop"
        name={ALL_SERVICES}
        icon={Icon.Stop}
        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
        onAction={props.onAction}
      />
      <ServiceActionItem
        action="restart"
        name={ALL_SERVICES}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={props.onAction}
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

export function ServiceActionPanel(props: { service: Service; onAction: () => void }) {
  const { service, onAction } = props;
  const running = brewServiceIsRunning(service);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Service">
        {running ? (
          <ServiceActionItem action="stop" name={service.name} icon={Icon.Stop} onAction={onAction} />
        ) : (
          <ServiceActionItem action="start" name={service.name} icon={Icon.Play} onAction={onAction} />
        )}
        <ServiceActionItem action="restart" name={service.name} icon={Icon.ArrowClockwise} onAction={onAction} />
      </ActionPanel.Section>
      <AllServicesSection onAction={onAction} />
      {service.file ? <PlistSection file={service.file} /> : null}
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onAction}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
