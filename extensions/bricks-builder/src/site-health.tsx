import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { ReactNode } from "react";
import { InstallHelperAction } from "./components/helper-install-action";
import { LicenseActions } from "./components/license-form";
import { SiteForm } from "./components/site-form";
import { SiteToolsSubmenu } from "./components/site-tools";
import { ManageSitesAction } from "./hooks/use-selected-site";
import { compareVersions, getHealth, HELPER_VERSION, SiteHealth } from "./lib/bricks-data";
import { HelperMissingError } from "./lib/design";
import { licenseLabel, LicenseSummary } from "./lib/license";
import { escapeMarkdown } from "./lib/markdown";
import { loadSites, Site, withoutSecrets, wpAdminUrl } from "./lib/sites";
import { HELPER_NAMESPACE, WordPressError, wpRequest } from "./lib/wordpress";

type Check =
  | { site: Site; state: "ok"; health: SiteHealth }
  /** Helper older than 1.4: only /status. */
  | { site: Site; state: "old-helper"; pluginVersion: string | null; bricksVersion: string | null }
  | { site: Site; state: "no-helper" | "no-password" | "auth" | "offline"; message: string };

async function checkSite(site: Site): Promise<Check> {
  if (!site.username || !site.appPassword) {
    return { site, state: "no-password", message: "Add an application password to check this site" };
  }
  try {
    return { site, state: "ok", health: await getHealth(site) };
  } catch (error) {
    if (error instanceof HelperMissingError) {
      try {
        const status = await wpRequest<{ plugin_version?: string; bricks_version?: string }>(
          site,
          `/${HELPER_NAMESPACE}/status`,
        );
        return {
          site,
          state: "old-helper",
          pluginVersion: status.plugin_version ?? null,
          bricksVersion: status.bricks_version ?? null,
        };
      } catch {
        return {
          site,
          state: "no-helper",
          message:
            "The Bricks Raycast Helper plugin isn't installed on this site. Press ⌘⇧H for step-by-step instructions to install it.",
        };
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof WordPressError && (error.status === 401 || error.status === 403)) {
      return { site, state: "auth", message };
    }
    return { site, state: "offline", message };
  }
}

function licenseTag(license: LicenseSummary): List.Item.Accessory {
  const color = license.active ? Color.Green : license.status === "none" ? Color.SecondaryText : Color.Red;
  return {
    tag: { value: licenseLabel(license), color },
    tooltip: license.active ? "Bricks Raycast Pro" : license.error || undefined,
  };
}

const STATES = new Set<Check["state"]>(["ok", "old-helper", "no-helper", "no-password", "auth", "offline"]);

// useCachedPromise keys its cache on the function's source and its arguments, so the
// "health" argument keeps it apart from other commands' site checks (Bricks Raycast Pro has one too).
const checkHealth = async (cacheKey: "health") => {
  void cacheKey;
  // The cached rows keep each site without its application password (see withoutSecrets).
  return (await Promise.all((await loadSites()).map(checkSite))).map((row) => ({
    ...row,
    site: withoutSecrets(row.site),
  }));
};

function updateCount(health: SiteHealth): number {
  const u = health.updates;
  return u ? (u.core ? 1 : 0) + u.plugins.length + u.themes.length : 0;
}

function accessories(check: Check): List.Item.Accessory[] {
  switch (check.state) {
    case "ok": {
      const h = check.health;
      const updates = updateCount(h);
      return [
        ...(h.maintenance_mode
          ? [
              {
                tag: {
                  value: h.maintenance_mode === "comingSoon" ? "Coming soon" : "Maintenance",
                  color: Color.Purple,
                },
              },
            ]
          : []),
        ...(compareVersions(h.plugin_version, HELPER_VERSION) < 0
          ? [
              {
                tag: { value: `Helper ${h.plugin_version}`, color: Color.Orange },
                tooltip: `Update to ${HELPER_VERSION}`,
              },
            ]
          : []),
        ...(updates > 0 ? [{ tag: { value: `${updates} updates`, color: Color.Orange } }] : []),
        ...(h.license ? [licenseTag(h.license)] : []),
        { tag: `Bricks ${h.bricks_version ?? "–"}` },
      ];
    }
    case "old-helper":
      return [
        {
          tag: { value: `Helper ${check.pluginVersion ?? "?"}`, color: Color.Orange },
          tooltip: `Update to ${HELPER_VERSION}`,
        },
        { tag: `Bricks ${check.bricksVersion ?? "–"}` },
      ];
    case "no-password":
      return [{ tag: { value: "Public only", color: Color.SecondaryText } }];
    case "no-helper":
      return [{ tag: { value: "No helper", color: Color.Orange } }];
    case "auth":
      return [{ tag: { value: "Sign-in failed", color: Color.Red } }];
    case "offline":
      return [{ tag: { value: "Unreachable", color: Color.Red } }];
  }
}

/** Missing or older than the helper this extension ships with. */
function needsHelper(check: Check): boolean {
  if (check.state === "no-helper" || check.state === "old-helper") return true;
  return check.state === "ok" && compareVersions(check.health.plugin_version, HELPER_VERSION) < 0;
}

function icon(check: Check): List.Item.Props["icon"] {
  if (check.state === "auth" || check.state === "offline") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (check.state !== "ok") return { source: Icon.Warning, tintColor: Color.Orange };
  const h = check.health;
  const attention = updateCount(h) > 0 || h.maintenance_mode || compareVersions(h.plugin_version, HELPER_VERSION) < 0;
  return attention
    ? { source: Icon.Dot, tintColor: Color.Orange }
    : { source: Icon.CheckCircle, tintColor: Color.Green };
}

function Detail(props: { check: Check }) {
  const { check } = props;
  if (check.state !== "ok") {
    const text =
      check.state === "old-helper"
        ? `The Bricks Raycast Helper plugin is ${check.pluginVersion ?? "an older version"}. Update it to ${HELPER_VERSION} to see versions, updates and settings here: press ⌘⇧H for step-by-step instructions.`
        : check.message;
    return <List.Item.Detail markdown={`## ${escapeMarkdown(check.site.name)}\n\n${escapeMarkdown(text)}`} />;
  }
  const h = check.health;
  const u = h.updates;
  const updates = u
    ? [
        ...(u.core ? [`- WordPress → ${u.core}`] : []),
        ...u.themes.map((t) => `- ${escapeMarkdown(t.name)} ${t.current ?? ""} → ${t.new}`),
        ...u.plugins.map((p) => `- ${escapeMarkdown(p.name)} ${p.current ?? ""} → ${p.new}`),
      ]
    : [];
  return (
    <List.Item.Detail
      markdown={
        u === null
          ? "_Your user can't see updates on this site._"
          : updates.length
            ? `**Updates available**\n\n${updates.join("\n")}`
            : "**Everything is up to date.**"
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Bricks" text={h.bricks_version ?? "Not active"} />
          <List.Item.Detail.Metadata.Label title="Theme" text={h.theme} />
          <List.Item.Detail.Metadata.Label
            title="Helper Plugin"
            text={
              compareVersions(h.plugin_version, HELPER_VERSION) < 0
                ? `${h.plugin_version} (update to ${HELPER_VERSION})`
                : h.plugin_version
            }
          />
          {h.license && (
            <List.Item.Detail.Metadata.TagList title="License">
              <List.Item.Detail.Metadata.TagList.Item
                text={licenseLabel(h.license)}
                color={h.license.active ? Color.Green : h.license.status === "none" ? Color.SecondaryText : Color.Red}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          {h.license?.expires_at && (
            <List.Item.Detail.Metadata.Label
              title={h.license.active ? "License Renews" : "License Expired"}
              text={new Date(h.license.expires_at).toLocaleDateString()}
            />
          )}
          {h.license?.activations != null && h.license.activation_limit != null && (
            <List.Item.Detail.Metadata.Label
              title="License Sites"
              text={`${h.license.activations} of ${h.license.activation_limit}`}
            />
          )}
          <List.Item.Detail.Metadata.Label title="WordPress" text={h.wp_version} />
          <List.Item.Detail.Metadata.Label title="PHP" text={h.php_version} />
          <List.Item.Detail.Metadata.Label title="Database" text={h.db_version} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Maintenance Mode"
            text={h.maintenance_mode ? (h.maintenance_mode === "comingSoon" ? "Coming soon" : "Maintenance") : "Off"}
          />
          <List.Item.Detail.Metadata.Label
            title="CSS Loading"
            text={h.css_loading === "file" ? "External files" : "Inline"}
          />
          <List.Item.Detail.Metadata.Label
            title="Code Execution"
            text={h.code_execution_enabled === null ? "–" : h.code_execution_enabled ? "Enabled" : "Disabled"}
          />
          <List.Item.Detail.Metadata.Label
            title="Environment"
            text={`${h.environment}${h.debug ? " · WP_DEBUG on" : ""}`}
          />
          {h.search_engines_blocked && (
            <List.Item.Detail.Metadata.Label title="Search Engines" text="Discouraged (Settings › Reading)" />
          )}
          {u?.checked_at && (
            <List.Item.Detail.Metadata.Label title="Updates Checked" text={new Date(u.checked_at).toLocaleString()} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** All your sites at a glance: versions, updates, maintenance mode, and whether Raycast can reach them. */
export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(checkHealth, ["health"], {
    keepPreviousData: true,
  });
  const [showingDetail, setShowingDetail] = useCachedState("health:detail", true);
  // The cached rows hold sites without passwords; put the saved sites back for the actions.
  const { data: sites = [] } = usePromise(loadSites);
  // Skip anything else a stale cache might hold.
  const checks = (data ?? [])
    .filter((check) => STATES.has(check.state))
    .map((check) => ({ ...check, site: sites.find((s) => s.id === check.site.id) ?? check.site }));

  const shared = (extra?: ReactNode) => (
    <ActionPanel.Section>
      {extra}
      <Action
        title={showingDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowingDetail(!showingDetail)}
      />
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <ManageSitesAction onPop={revalidate} />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && checks.length > 0}
      searchBarPlaceholder="Filter sites…"
    >
      <List.EmptyView
        icon={Icon.Globe}
        title={isLoading ? "Checking your sites…" : "No sites yet"}
        actions={<ActionPanel>{shared()}</ActionPanel>}
      />
      {checks.map((check) => (
        <List.Item
          key={check.site.id}
          icon={icon(check)}
          title={check.site.name}
          subtitle={showingDetail ? undefined : check.site.url.replace(/^https?:\/\//, "")}
          keywords={[check.site.url, check.state]}
          accessories={showingDetail ? accessories(check).slice(0, 1) : accessories(check)}
          detail={<Detail check={check} />}
          actions={
            <ActionPanel>
              {needsHelper(check) && (
                <InstallHelperAction
                  site={check.site}
                  mode={check.state === "no-helper" ? "install" : "update"}
                  onDone={revalidate}
                />
              )}
              <Action.OpenInBrowser title="Open WordPress Admin" icon={Icon.Gear} url={wpAdminUrl(check.site)} />
              <Action.OpenInBrowser
                title="Open Updates"
                icon={Icon.Download}
                url={wpAdminUrl(check.site, "update-core.php")}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action.OpenInBrowser
                title="Open Site"
                icon={Icon.Globe}
                url={check.site.url}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              <Action.OpenInBrowser
                title="Open Bricks Settings"
                icon={Icon.Hammer}
                url={wpAdminUrl(check.site, "admin.php?page=bricks-settings")}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
              />
              {check.state === "ok" && check.health.can_manage && (
                <SiteToolsSubmenu
                  site={check.site}
                  maintenanceMode={check.health.maintenance_mode}
                  onDone={revalidate}
                />
              )}
              {check.state === "ok" && check.health.can_manage && check.health.license && (
                <LicenseActions
                  site={check.site}
                  hasLicense={check.health.license.status !== "none"}
                  onChange={revalidate}
                />
              )}
              {check.state === "ok" && !needsHelper(check) && (
                <InstallHelperAction site={check.site} mode="reinstall" onDone={revalidate} />
              )}
              {shared(
                <Action.Push
                  title="Edit Site"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<SiteForm site={check.site} onSaved={revalidate} />}
                />,
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
