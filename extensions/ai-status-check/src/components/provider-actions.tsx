import { Action, ActionPanel, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import type { ComponentStatus, Incident } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";

interface ProviderActionsProps {
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
}

interface NavigationActionsProps extends ProviderActionsProps {
  target: Action.Push.Props["target"];
}

export function ProviderListActions({
  provider,
  detail,
  onRefreshAll,
}: {
  provider: ProviderDefinition;
  detail: Action.Push.Props["target"];
  onRefreshAll(): Promise<void>;
}) {
  return (
    <ActionPanel>
      <Action.Push title="View Provider Details" icon={Icon.Sidebar} target={detail} />
      <OpenProviderStatusAction provider={provider} />
      <Action
        title="Refresh All Providers"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefreshAll}
      />
      <Action title="Configure Providers" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

export function ProviderSourceActions({ provider, onRefresh }: ProviderActionsProps) {
  return (
    <ActionPanel>
      <OpenProviderStatusAction provider={provider} />
      <RefreshProviderAction onRefresh={onRefresh} />
    </ActionPanel>
  );
}

export function ComponentActions({
  component,
  provider,
  onRefresh,
}: ProviderActionsProps & { component: ComponentStatus }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title={component.url ? "Open Component Status" : "Open Official Status Page"}
        url={component.url ?? provider.statusPageUrl}
      />
      <RefreshProviderAction onRefresh={onRefresh} />
      {component.url ? <Action.OpenInBrowser title="Open Official Status Page" url={provider.statusPageUrl} /> : null}
    </ActionPanel>
  );
}

export function ComponentListActions({ provider, target, onRefresh }: NavigationActionsProps) {
  return (
    <ActionPanel>
      <Action.Push title="View Components" icon={Icon.Sidebar} target={target} />
      <OpenProviderStatusAction provider={provider} />
      <RefreshProviderAction onRefresh={onRefresh} />
    </ActionPanel>
  );
}

export function IncidentActions({
  incident,
  provider,
  target,
  onRefresh,
}: NavigationActionsProps & { incident: Incident }) {
  return (
    <ActionPanel>
      <Action.Push title="View Incident Details" icon={Icon.AppWindowSidebarLeft} target={target} />
      {incident.url ? (
        <Action.OpenInBrowser
          title="Open Official Incident"
          url={incident.url}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      ) : null}
      <RefreshProviderAction onRefresh={onRefresh} />
      {incident.url ? (
        <Action.CopyToClipboard
          title="Copy Incident Link"
          content={incident.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
      <Action.OpenInBrowser title="Open Official Status Page" url={provider.statusPageUrl} />
    </ActionPanel>
  );
}

export function IncidentDetailActions({ incident, provider }: { incident: Incident; provider: ProviderDefinition }) {
  return (
    <ActionPanel>
      {incident.url ? (
        <Action.OpenInBrowser
          title="Open Official Incident"
          url={incident.url}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      ) : null}
      {incident.url ? (
        <Action.CopyToClipboard
          title="Copy Incident Link"
          content={incident.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
      <Action.OpenInBrowser title="Open Official Status Page" url={provider.statusPageUrl} />
    </ActionPanel>
  );
}

function OpenProviderStatusAction({ provider }: { provider: ProviderDefinition }) {
  return (
    <Action.OpenInBrowser
      title="Open Official Status Page"
      url={provider.statusPageUrl}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

function RefreshProviderAction({ onRefresh }: { onRefresh(): Promise<void> }) {
  return (
    <Action
      title="Refresh Provider"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}
