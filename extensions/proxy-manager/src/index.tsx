import { Action, ActionPanel, Color, Icon, Keyboard, List, showHUD, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { AppModePrimary, AppModeSection } from "./components/app-mode-actions";
import { ConnectionError } from "./components/connection-error";
import { SiteRow } from "./components/site-row";
import { TargetForm } from "./components/target-form";
import * as api from "./lib/api";
import { loadDashboard, readDashboardCache } from "./lib/dashboard";
import { isWildcard, wildcardBase } from "./lib/host";
import { goToCommand, openDashboard, openSettings, revealTarget } from "./lib/navigation";
import { isOn, listener, modeColor, modeLabel, presentation, targetIcon, tunnelIcon } from "./lib/presentation";
import { confirmDestructive, reportFailure } from "./lib/toast";
import type { Status, Target } from "./lib/types";

type Filter = "all" | "enabled" | "disabled";

/**
 * The hub: one row per decision the user might be making right now — routing,
 * a link on the clipboard, then the target list. Everything else is a push or a
 * different command, never a second copy of the same row.
 */
export default function Command() {
  const [initialData] = useState(readDashboardCache);
  const { data, isLoading, revalidate } = useCachedPromise(loadDashboard, [], {
    initialData,
    keepPreviousData: true,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const { pop } = useNavigation();

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      await revalidate();
      await showHUD(success);
    } catch (error) {
      await reportFailure(error, "Proxy Manager refused the change");
      await revalidate();
    }
  }

  async function removeTarget(target: Target) {
    const confirmed = await confirmDestructive({
      title: `Remove ${target.pattern}?`,
      message: "Traffic to this host goes direct as soon as the rule is gone.",
      actionTitle: "Remove Target",
    });
    if (!confirmed) return;
    await run(() => api.removeTarget(target.id), `Removed ${target.pattern}`);
  }

  if (data === undefined) {
    return <List isLoading={true} searchBarPlaceholder="Talking to Proxy Manager…" />;
  }

  if (data.kind === "unavailable") {
    return (
      <ConnectionError
        dashboard={data}
        onRetry={() => {
          void revalidate();
        }}
      />
    );
  }

  const { status, targets, presets, suggestion, site, app } = data;
  const state = presentation(status);
  const on = isOn(status);
  const enabledTargets = targets.filter((target) => target.enabled);
  const visibleTargets = targets.filter((target) =>
    filter === "all" ? true : filter === "enabled" ? target.enabled : !target.enabled,
  );
  const showSuggestion = suggestion !== null && !suggestionDismissed;
  const showAppRow = app !== null && app.appsEnabled;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={targets.length > 0 ? `Search ${targets.length} targets…` : "Search targets…"}
      searchBarAccessory={
        targets.length > 1 ? (
          <List.Dropdown tooltip="Filter targets" value={filter} onChange={(value) => setFilter(value as Filter)}>
            <List.Dropdown.Item title={`All (${targets.length})`} value="all" />
            <List.Dropdown.Item title={`Enabled (${enabledTargets.length})`} value="enabled" />
            <List.Dropdown.Item title={`Disabled (${targets.length - enabledTargets.length})`} value="disabled" />
          </List.Dropdown>
        ) : null
      }
    >
      <List.Section title="Routing">
        <List.Item
          id="routing"
          icon={{ source: state.icon, tintColor: state.tint }}
          title={state.title}
          subtitle={`${listener(status)} · ${enabledTargets.length} of ${targets.length} ${targets.length === 1 ? "target" : "targets"}`}
          accessories={routingAccessories(status)}
          actions={<RoutingActions status={status} on={on} run={run} revalidate={revalidate} />}
        />

        {!status.onboardingComplete ? (
          <List.Item
            id="onboarding"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            title="Proxy Manager isn't set up yet"
            subtitle="Finish the first-run setup so routing has a tunnel and targets"
            actions={
              <ActionPanel>
                <Action title="Finish Setup" icon={Icon.AppWindow} onAction={() => openDashboard()} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        ) : null}

        {status.authorizationDeferred ? (
          <List.Item
            id="authorization"
            icon={{ source: Icon.Lock, tintColor: Color.Orange }}
            title="Waiting for an administrator approval"
            subtitle="Proxy Manager could not apply the system proxy without it"
            actions={
              <ActionPanel>
                <Action title="Open Proxy Manager" icon={Icon.AppWindow} onAction={() => openDashboard()} />
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  onAction={() => run(() => api.retryRouting(), "Retrying the system proxy…")}
                />
              </ActionPanel>
            }
          />
        ) : null}

        {status.lastError ? (
          <List.Item
            id="last-error"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            title="Last error"
            subtitle={status.lastError}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Error" content={status.lastError} />
                <Action title="Open Proxy Manager" icon={Icon.AppWindow} onAction={() => openDashboard()} />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>

      {site || showAppRow ? (
        <List.Section title="Right Now">
          {site ? (
            <SiteRow
              site={site}
              appName={app?.name}
              onAdd={() => run(() => api.addTarget(site.host, true), `Routing ${site.host}`)}
              onExplain={() => goToCommand("explain-host", { host: site.host })}
              onDisable={(target) =>
                run(() => api.updateTarget(target.id, { enabled: false }), `Disabled ${target.pattern}`)
              }
              onTurnOn={() => run(() => api.setRouting(true), "Routing on")}
              onReveal={(pattern) => revealTarget(pattern)}
            />
          ) : null}

          {showAppRow && app ? (
            <List.Item
              id="current-app"
              icon={{ source: Icon.AppWindow, tintColor: Color.PrimaryText }}
              title={app.name}
              subtitle={app.ruleId ? `${app.bundleId} · rule` : `${app.bundleId} · no rule`}
              accessories={[{ tag: { value: modeLabel(app.mode), color: modeColor(app.mode) } }]}
              actions={
                <ActionPanel>
                  <AppModePrimary app={app} onDone={revalidate} />
                  <AppModeSection app={app} onDone={revalidate} />
                  <ActionPanel.Section>
                    <Action
                      title="App Routing…"
                      icon={Icon.AppWindowSidebarLeft}
                      onAction={() => goToCommand("app-routing")}
                    />
                    <Action title="Reveal in Proxy Manager" icon={Icon.Gear} onAction={() => openSettings("apps")} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ) : null}
        </List.Section>
      ) : null}

      {showSuggestion ? (
        <List.Section title="From the Clipboard">
          <List.Item
            id="clipboard-suggestion"
            icon={{ source: Icon.Clipboard, tintColor: Color.Blue }}
            title={`Add ${suggestion}`}
            subtitle="Copied link detected — this host is still going direct"
            actions={
              <ActionPanel>
                <Action
                  title="Add as Target"
                  icon={Icon.Plus}
                  onAction={() => run(() => api.addTarget(suggestion, true), `Routing ${suggestion}`)}
                />
                <Action
                  title="Explain Routing"
                  icon={Icon.QuestionMark}
                  onAction={() => goToCommand("explain-host", { host: suggestion })}
                />
                <Action title="Dismiss" icon={Icon.XMarkCircle} onAction={() => setSuggestionDismissed(true)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="Targets" subtitle={targets.length > 0 ? `${visibleTargets.length} shown` : undefined}>
        <List.Item
          id="add-target"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          title="Add Target…"
          subtitle={site?.host ? `Starts with ${site.host}` : "Route a host or wildcard through the tunnel"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Target"
                icon={Icon.Plus}
                target={
                  <TargetForm
                    initialPattern={site?.host ?? suggestion ?? undefined}
                    onSaved={async () => {
                      pop();
                      await revalidate();
                    }}
                  />
                }
              />
              <PresetSubmenu presets={presets} run={run} />
              <Action
                title="App Routing…"
                icon={Icon.AppWindowSidebarLeft}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                onAction={() => goToCommand("app-routing")}
              />
            </ActionPanel>
          }
        />

        {visibleTargets.map((target) => (
          <List.Item
            key={target.id}
            id={target.id}
            icon={targetIcon(target.pattern, target.enabled)}
            title={target.pattern}
            subtitle={target.enabled ? undefined : "Disabled — goes direct"}
            accessories={isWildcard(target.pattern) ? [{ tag: { value: "Wildcard" } }] : []}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={target.enabled ? "Disable Target" : "Enable Target"}
                    icon={target.enabled ? Icon.CircleDisabled : Icon.CheckCircle}
                    onAction={() =>
                      run(
                        () => api.updateTarget(target.id, { enabled: !target.enabled }),
                        target.enabled ? `Disabled ${target.pattern}` : `Enabled ${target.pattern}`,
                      )
                    }
                  />
                  <Action.Push
                    title="Edit Target…"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={
                      <TargetForm
                        target={target}
                        onSaved={async () => {
                          pop();
                          await revalidate();
                        }}
                      />
                    }
                  />
                  <Action
                    title="Remove Target"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => removeTarget(target)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={isWildcard(target.pattern) ? "Explain Base Host" : "Explain This Host"}
                    icon={Icon.QuestionMark}
                    onAction={() => goToCommand("explain-host", { host: wildcardBase(target.pattern) })}
                  />
                  <Action
                    title="Reveal in Proxy Manager"
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={() => revealTarget(target.pattern)}
                  />
                  <Action.CopyToClipboard title="Copy Host" content={target.pattern} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}

        {visibleTargets.length === 0 ? (
          <List.Item
            id="no-targets"
            icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
            title={filter === "all" ? "No targets yet" : "Nothing matches this filter"}
            subtitle={
              filter === "all"
                ? "Everything goes direct until you add one"
                : filter === "enabled"
                  ? "Every target is disabled"
                  : "Every target is enabled"
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Target"
                  icon={Icon.Plus}
                  target={
                    <TargetForm
                      onSaved={async () => {
                        pop();
                        await revalidate();
                      }}
                    />
                  }
                />
                <PresetSubmenu presets={presets} run={run} />
                <Action title="Show All Targets" icon={Icon.List} onAction={() => setFilter("all")} />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
    </List>
  );
}

function routingAccessories(status: Status) {
  if (status.state === "off" || status.state === "stopping") return [];
  return [
    {
      icon: tunnelIcon(status),
      tooltip: status.tunnelUp ? "SOCKS5 tunnel reachable" : "SOCKS5 tunnel unreachable",
    },
  ];
}

function RoutingActions({
  status,
  on,
  run,
  revalidate,
}: {
  status: Status;
  on: boolean;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
  revalidate: () => void;
}) {
  const degraded = status.state === "degraded";

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {degraded ? (
          <Action
            title="Retry Routing"
            icon={Icon.ArrowClockwise}
            onAction={() => run(() => api.retryRouting(), "Retrying…")}
          />
        ) : (
          <Action
            title={on ? "Turn Routing Off" : "Turn Routing On"}
            icon={on ? Icon.Circle : Icon.Play}
            onAction={() => run(() => api.setRouting(!on), on ? "Routing off — traffic goes direct" : "Routing on")}
          />
        )}
        <Action
          title="Toggle Routing"
          icon={Icon.Switch}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={() => run(() => api.toggleRouting(), on ? "Routing off — traffic goes direct" : "Routing on")}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Open Proxy Manager"
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => openDashboard()}
        />
        <Action
          title="Open Settings…"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          onAction={() => openSettings()}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => revalidate()}
        />
        <Action.CopyToClipboard
          title="Copy Status"
          content={JSON.stringify(status, null, 2)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Explain a Host…"
          icon={Icon.QuestionMark}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => goToCommand("explain-host")}
        />
        <Action title="App Routing…" icon={Icon.AppWindowSidebarLeft} onAction={() => goToCommand("app-routing")} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function PresetSubmenu({
  presets,
  run,
}: {
  presets: { id: string; name: string; count: number; summary: string }[];
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  if (presets.length === 0) return null;

  return (
    <ActionPanel.Submenu title="Add a Preset…" icon={Icon.Star} shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}>
      {presets.map((preset) => (
        <Action
          key={preset.id}
          title={`${preset.name} (${preset.count})`}
          onAction={() => run(() => api.applyPreset(preset.id), `Added ${preset.name}`)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
