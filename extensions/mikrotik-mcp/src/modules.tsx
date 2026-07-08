/**
 * Modules command — mirrors the dashboard's Modules tab: every catalog tool
 * module grouped by scope, with per-module / per-group / all toggles and the
 * global MCP App Views switch. Each toggle persists to the config file and
 * applies live (the MCP client must reconnect to see the change).
 */
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { postJson } from "./lib/api";
import { showFailureToast } from "./lib/confirm";
import { useApi } from "./lib/hooks";
import type { ModuleItem, ModuleSurface } from "./lib/types";

export default function Command() {
  const { data, isLoading, revalidate } = useApi<ModuleSurface>("/api/modules");
  const modules = data?.modules ?? [];

  const groups = new Map<string, ModuleItem[]>();
  for (const m of modules)
    groups.set(m.group, [...(groups.get(m.group) ?? []), m]);

  async function toggle(slug: string, enabled: boolean, label: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${enabled ? "Enabling" : "Disabling"} ${label}…`,
    });
    try {
      const res = await postJson<
        ModuleSurface & {
          ok?: boolean;
          error?: string;
          requiresReconnect?: boolean;
          warning?: string;
        }
      >("/api/modules/toggle", { slug, enabled });
      if (res.error) throw new Error(res.error);
      toast.style = Toast.Style.Success;
      toast.title = `${label} ${enabled ? "enabled" : "disabled"}`;
      if (res.requiresReconnect)
        toast.message = "Reconnect the MCP client to apply";
      else if (res.warning) toast.message = res.warning;
      revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: `Could not toggle ${label}` });
    }
  }

  async function bulk(items: ModuleItem[], enabled: boolean, what: string) {
    const targets = items.filter((m) => m.enabled !== enabled);
    if (targets.length === 0) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${enabled ? "Enabling" : "Disabling"} ${what}…`,
    });
    try {
      for (const m of targets) {
        const res = await postJson<{ ok?: boolean; error?: string }>(
          "/api/modules/toggle",
          { slug: m.slug, enabled },
        );
        if (res.ok !== true)
          throw new Error(res.error ?? `Could not toggle ${m.slug}`);
      }
      toast.style = Toast.Style.Success;
      toast.title = `${what} ${enabled ? "enabled" : "disabled"}`;
      revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: `Could not update ${what}` });
    }
  }

  async function toggleAppViews() {
    const next = !data?.appViews;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${next ? "Enabling" : "Disabling"} App Views…`,
    });
    try {
      const res = await postJson<{
        ok?: boolean;
        error?: string;
        requiresReconnect?: boolean;
      }>("/api/modules/app-views", {
        enabled: next,
      });
      if (res.error) throw new Error(res.error);
      toast.style = Toast.Style.Success;
      toast.title = `App Views ${next ? "enabled" : "disabled"}`;
      if (res.requiresReconnect) toast.message = "Restart the server to apply";
      revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: "Could not toggle App Views" });
    }
  }

  const globalActions = (
    <ActionPanel.Section title="All modules">
      <Action
        title="Enable All"
        icon={Icon.Checkmark}
        onAction={() => bulk(modules, true, "all modules")}
      />
      <Action
        title="Disable All"
        icon={Icon.Circle}
        onAction={() => bulk(modules, false, "all modules")}
      />
      <Action
        title={`${data?.appViews ? "Disable" : "Enable"} MCP App Views`}
        icon={Icon.AppWindow}
        onAction={toggleAppViews}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter modules…"
      navigationTitle={
        data
          ? `Modules · ${data.enabledModules}/${data.total} on · ${data.enabledTools}/${data.totalTools} tools`
          : "Modules"
      }
      actions={<ActionPanel>{globalActions}</ActionPanel>}
    >
      {[...groups.entries()].map(([group, items]) => {
        const on = items.filter((m) => m.enabled).length;
        return (
          <List.Section
            key={group}
            title={group}
            subtitle={`${on}/${items.length} on`}
          >
            {items.map((m) => (
              <List.Item
                key={m.slug}
                icon={{
                  source: m.enabled ? Icon.CheckCircle : Icon.Circle,
                  tintColor: m.enabled ? Color.Green : Color.SecondaryText,
                }}
                title={m.label}
                subtitle={m.slug}
                keywords={[m.slug, m.group]}
                accessories={[{ text: `${m.toolCount} tools` }]}
                actions={
                  <ActionPanel>
                    <Action
                      title={m.enabled ? "Disable Module" : "Enable Module"}
                      icon={m.enabled ? Icon.Circle : Icon.Checkmark}
                      onAction={() => toggle(m.slug, !m.enabled, m.label)}
                    />
                    <ActionPanel.Section title={group}>
                      <Action
                        title="Enable Group"
                        icon={Icon.Checkmark}
                        onAction={() => bulk(items, true, group)}
                      />
                      <Action
                        title="Disable Group"
                        icon={Icon.Circle}
                        onAction={() => bulk(items, false, group)}
                      />
                    </ActionPanel.Section>
                    {globalActions}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
