import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { InstallHelperAction } from "./components/helper-install-action";
import { LicenseActions, LicenseForm, licenseFailure } from "./components/license-form";
import { SiteForm } from "./components/site-form";
import { ManageSitesAction } from "./hooks/use-selected-site";
import { useSiteChecks } from "./hooks/use-site-checks";
import {
  activateLicense,
  BUY_URL,
  forgetKey,
  getLicense,
  getSavedKey,
  keyHint,
  licenseLabel,
  LicenseSummary,
  LICENSE_VERSION,
} from "./lib/license";
import { Site } from "./lib/sites";
import { isMissingRoute, WordPressError } from "./lib/wordpress";

type Row =
  | { site: Site; state: "licensed"; license: LicenseSummary }
  | { site: Site; state: "no-password" | "old-helper" | "auth" | "offline"; message: string };

async function checkSite(site: Site): Promise<Row> {
  if (!site.username || !site.appPassword) {
    return { site, state: "no-password", message: "Add an application password to use Pro on this site" };
  }
  try {
    return { site, state: "licensed", license: await getLicense(site) };
  } catch (error) {
    if (isMissingRoute(error)) {
      return {
        site,
        state: "old-helper",
        message: `Install or update the Bricks Raycast Helper plugin to ${LICENSE_VERSION} or later`,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof WordPressError && (error.status === 401 || error.status === 403)) {
      return { site, state: "auth", message };
    }
    return { site, state: "offline", message };
  }
}

const STATES = new Set<Row["state"]>(["licensed", "no-password", "old-helper", "auth", "offline"]);

function accessories(row: Row): List.Item.Accessory[] {
  switch (row.state) {
    case "licensed": {
      const { license } = row;
      const color = license.active ? Color.Green : license.status === "none" ? Color.SecondaryText : Color.Red;
      return [
        ...(license.active && license.expires_at
          ? [{ text: `Renews ${new Date(license.expires_at).toLocaleDateString()}` }]
          : []),
        { tag: { value: licenseLabel(license), color }, tooltip: license.error || undefined },
      ];
    }
    case "no-password":
      return [{ tag: { value: "Public only", color: Color.SecondaryText }, tooltip: row.message }];
    case "old-helper":
      return [{ tag: { value: `Needs helper ${LICENSE_VERSION}`, color: Color.Orange }, tooltip: row.message }];
    case "auth":
      return [{ tag: { value: "Sign-in failed", color: Color.Red }, tooltip: row.message }];
    case "offline":
      return [{ tag: { value: "Unreachable", color: Color.Red }, tooltip: row.message }];
  }
}

function icon(row: Row): List.Item.Props["icon"] {
  if (row.state !== "licensed") return { source: Icon.Warning, tintColor: Color.Orange };
  if (row.license.active) return { source: Icon.CheckCircle, tintColor: Color.Green };
  return row.license.status === "none"
    ? { source: Icon.Circle, tintColor: Color.SecondaryText }
    : { source: Icon.XMarkCircle, tintColor: Color.Red };
}

/** Your license key and which of your sites have Pro: activate it on one site or all of them. */
export default function Command() {
  const {
    rows,
    isLoading,
    recheck,
    reload: reloadChecks,
  } = useSiteChecks("licenses", checkSite, (row) => STATES.has(row.state));
  // usePromise, not useCachedPromise: the key shouldn't sit in Raycast's unencrypted cache.
  const { data: savedKey, revalidate: reloadKey } = usePromise(getSavedKey);
  /** After a license or the helper changed on a site (activating also saves the key). */
  const refreshLicenses = () => {
    reloadKey();
    recheck();
  };
  /** After sites were added, edited or removed. */
  const reload = () => {
    reloadKey();
    reloadChecks();
  };

  const waiting = rows.filter((row) => row.state === "licensed" && !row.license.active);

  async function activateAll() {
    if (!savedKey) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Activating on ${waiting.length} sites…` });
    const failed: string[] = [];
    for (const row of waiting) {
      toast.message = row.site.name;
      try {
        const license = await activateLicense(row.site, savedKey);
        if (!license.active) throw new Error(license.error || `The license is ${license.status}.`);
      } catch (error) {
        failed.push(`${row.site.name}: ${licenseFailure(row.site, error)}`);
      }
    }
    await recheck();
    toast.style = failed.length ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = failed.length
      ? `Activated on ${waiting.length - failed.length} of ${waiting.length} sites`
      : `Bricks Raycast Pro is active on ${waiting.length} ${waiting.length === 1 ? "site" : "sites"}`;
    toast.message = failed.join("\n") || undefined;
  }

  async function forget() {
    const confirmed = await confirmAlert({
      title: "Forget the saved license key?",
      message: "It stays active on your sites; Raycast just won't offer it for new ones.",
      primaryAction: { title: "Forget", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await forgetKey();
    reloadKey();
  }

  // ⌘⇧L belongs to the site's own license actions on site rows.
  const keyActions = (withShortcut: boolean) => (
    <ActionPanel.Section title="License Key">
      <Action.Push
        title={savedKey ? "Change License Key" : "Add License Key"}
        icon={Icon.Key}
        shortcut={withShortcut ? { modifiers: ["cmd", "shift"], key: "l" } : undefined}
        target={<LicenseForm onSaved={reloadKey} />}
      />
      {savedKey && waiting.length > 0 && (
        <Action
          title={`Activate on All Sites (${waiting.length})`}
          icon={Icon.CheckCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={activateAll}
        />
      )}
      <Action.OpenInBrowser title="Buy Bricks Raycast Pro" icon={Icon.Cart} url={BUY_URL} />
      {savedKey && (
        <Action title="Forget Saved License Key" icon={Icon.Trash} style={Action.Style.Destructive} onAction={forget} />
      )}
    </ActionPanel.Section>
  );

  const common = (
    <ActionPanel.Section>
      <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={reload} />
      <ManageSitesAction onPop={reload} />
    </ActionPanel.Section>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter sites…">
      <List.Section title="License">
        <List.Item
          icon={{ source: Icon.Key, tintColor: savedKey ? Color.Green : Color.SecondaryText }}
          title={savedKey ? `License key ${keyHint(savedKey)}` : "Add your license key"}
          subtitle={
            savedKey
              ? waiting.length > 0
                ? `Ready to activate on ${waiting.length} more ${waiting.length === 1 ? "site" : "sites"} (⌘⇧A)`
                : "Saved in Raycast"
              : "From your purchase email, or buy Bricks Raycast Pro"
          }
          actions={
            <ActionPanel>
              {keyActions(true)}
              {common}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Sites">
        {rows.map((row) => (
          <List.Item
            key={row.site.id}
            icon={icon(row)}
            title={row.site.name}
            subtitle={row.site.url.replace(/^https?:\/\//, "")}
            accessories={accessories(row)}
            actions={
              <ActionPanel>
                {row.state === "licensed" && (
                  <LicenseActions
                    site={row.site}
                    hasLicense={row.license.status !== "none"}
                    onChange={refreshLicenses}
                  />
                )}
                {row.state === "old-helper" && (
                  <InstallHelperAction site={row.site} mode="update" onDone={refreshLicenses} />
                )}
                {row.state === "no-password" || row.state === "auth" ? (
                  <Action.Push
                    title="Edit Site"
                    icon={Icon.Pencil}
                    target={<SiteForm site={row.site} onSaved={reload} />}
                  />
                ) : null}
                {row.state === "licensed" && (
                  <Action.OpenInBrowser
                    title="Open License Settings in WordPress"
                    icon={Icon.Gear}
                    url={row.license.settings_url}
                  />
                )}
                {keyActions(row.state !== "licensed")}
                {common}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
