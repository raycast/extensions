// Sites command: searchable list of Yerd sites (linked + parked) with open,
// copy, secure/unsecure, and per-site PHP version actions.
//
// Argv verified against Yerd CLI help:
//   secure/unsecure:  `yerd secure <name>` / `yerd unsecure <name>`
//   site PHP pin:     `yerd use <site> <version>`  (NOT `set php`, which is a
//                     global ini default)
//   "global default": Yerd has no site-level PHP unset; `yerd use <site> default`
//                     exits 2. The closest operation is pinning the site to the
//                     current global default from `list php`.

import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { DomainsView } from "./components/DomainsView";
import { runYerd, TIMEOUTS } from "./yerd/cli";
import { siteUrl } from "./helpers/urls";
import { frameworkTag, siteKindLabel } from "./helpers/format";
import type {
  PhpVersionsResponse,
  SitesResponse,
  StatusResponse,
  TunnelStatusResponse,
  YerdSite,
} from "./yerd/types";

interface ParkedListResponse {
  type: "parked";
  paths: string[];
}

interface TunnelShareResponse {
  url?: string;
  share_url?: string;
}

function userMessage(e: unknown): string {
  const msg = (e as { userMessage?: string }).userMessage;
  return msg ?? "Yerd command failed";
}

export default function Sites() {
  const {
    isLoading: sitesLoading,
    data: sitesData,
    revalidate: revalidateSites,
  } = useCachedPromise(() => runYerd<SitesResponse>(["sites"]), [], {
    keepPreviousData: true,
  });

  const { isLoading: statusLoading, data: statusData } = useCachedPromise(
    () => runYerd<StatusResponse>(["status"]),
    [],
    { keepPreviousData: true },
  );

  const { isLoading: phpLoading, data: phpData } = useCachedPromise(
    () => runYerd<PhpVersionsResponse>(["list", "php"]),
    [],
    { keepPreviousData: true },
  );

  const { data: tunnelData } = useCachedPromise(
    () => runYerd<TunnelStatusResponse>(["tunnel", "status"]),
    [],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Tunnel status unavailable" },
    },
  );

  const isLoading = sitesLoading || statusLoading || phpLoading;
  const sites = sitesData?.sites ?? [];
  // StatusResponse wraps the payload: { type: "status", report: YerdStatusReport }
  const report = statusData?.report;
  const linkedSites = sites.filter((s) => s.kind === "linked");
  const parkedSites = sites.filter((s) => s.kind === "parked");
  const tunnelAvailable = tunnelData?.cloudflared.installed ?? false;

  async function toggleSecure(name: string, secure: boolean) {
    const cmd = secure ? "unsecure" : "secure";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${cmd === "secure" ? "Securing" : "Unsecuring"} ${name}…`,
    });
    try {
      await runYerd([cmd, name], { timeoutMs: TIMEOUTS.secure });
      toast.style = Toast.Style.Success;
      toast.title = `${cmd === "secure" ? "Secured" : "Unsecured"} ${name}`;
      revalidateSites();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  async function setPhp(name: string, version: string) {
    // Verified argv: `yerd use <site> <version>`
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting PHP ${version} for ${name}…`,
    });
    try {
      await runYerd(["use", name, version], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = `PHP ${version} set for ${name}`;
      revalidateSites();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  async function useGlobalDefault(name: string, defaultVersion: string) {
    // No site-level unset exists in the Yerd CLI; pin to the global default.
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Resetting ${name} to global default…`,
    });
    try {
      await runYerd(["use", name, defaultVersion], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `${name} now uses global default (PHP ${defaultVersion})`;
      revalidateSites();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  async function shareTunnel(name: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Sharing ${name} via tunnel…`,
    });
    try {
      const result = await runYerd<TunnelShareResponse>(
        ["tunnel", "share", name],
        { timeoutMs: TIMEOUTS.tunnelShare },
      );
      const url = result.url ?? result.share_url;
      toast.style = Toast.Style.Success;
      toast.title = "Tunnel active";
      toast.message = url ?? "";
      if (url) await Clipboard.copy(url);
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  async function stopTunnel(name: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Stopping tunnel for ${name}…`,
    });
    try {
      await runYerd(["tunnel", "stop", name], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = "Tunnel stopped";
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  async function unlinkSite(name: string) {
    const confirmed = await confirmAlert({
      title: `Unlink "${name}"?`,
      message:
        "The site will no longer be served. The directory is left intact.",
      primaryAction: {
        title: "Unlink",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Unlinking ${name}…`,
    });
    try {
      await runYerd(["unlink", name], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = `${name} unlinked`;
      revalidateSites();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  async function unparkSite(name: string) {
    let parkedRoot: string | undefined;
    try {
      const siteData = sitesData?.sites.find((site) => site.name === name);
      const parked = await runYerd<ParkedListResponse>(["list", "parked"]);
      parkedRoot = parked.paths.find(
        (path) =>
          siteData?.document_root === path ||
          siteData?.document_root.startsWith(`${path}/`),
      );
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
      return;
    }

    if (!parkedRoot) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot unpark",
        message:
          "Could not resolve the parked root directory. Use the Yerd app or CLI.",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Unpark "${parkedRoot}"?`,
      message: `This removes the entire parked directory. All sites within "${parkedRoot}" will stop being served.`,
      primaryAction: {
        title: "Unpark",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Unparking directory…",
    });
    try {
      await runYerd(["unpark", parkedRoot], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = "Directory unparked";
      revalidateSites();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  function renderSiteItem(site: YerdSite) {
    const tag = frameworkTag(site);
    const url = report ? siteUrl(site, report) : undefined;

    const accessories: List.Item.Accessory[] = [
      { tag: { value: site.php, color: Color.Blue } },
      ...(site.secure
        ? [{ icon: { source: Icon.Lock, tintColor: Color.Green } }]
        : []),
      ...(tag
        ? [
            {
              tag: {
                value: tag,
                color: tag === "Laravel" ? Color.Red : Color.Blue,
              },
            },
          ]
        : []),
    ];

    return (
      <List.Item
        key={site.name}
        title={site.name}
        subtitle={url ?? `${site.name}.${report?.tld ?? "test"}`}
        icon={Icon.Globe}
        accessories={accessories}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="URL"
                  text={url ?? "—"}
                />
                <List.Item.Detail.Metadata.Label
                  title="Kind"
                  text={siteKindLabel(site.kind)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Document Root"
                  text={site.document_root}
                />
                {site.web_subpath ? (
                  <List.Item.Detail.Metadata.Label
                    title="Web Subpath"
                    text={site.web_subpath}
                  />
                ) : null}
                <List.Item.Detail.Metadata.Label title="PHP" text={site.php} />
                <List.Item.Detail.Metadata.Label
                  title="Secure (HTTPS)"
                  text={site.secure ? "Yes" : "No"}
                />
                <List.Item.Detail.Metadata.Label
                  title="Front Controller"
                  text={site.uses_front_controller ? "Yes" : "No"}
                />
                {tag ? (
                  <List.Item.Detail.Metadata.Label
                    title="Framework"
                    text={tag}
                  />
                ) : null}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {url && (
                <Action.OpenInBrowser title="Open in Browser" url={url} />
              )}
              <Action.ShowInFinder
                title="Show in Finder"
                path={site.document_root}
              />
              <Action.OpenWith title="Open with" path={site.document_root} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {url && (
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={url}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Path"
                content={site.document_root}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={site.secure ? "Unsecure (HTTP)" : "Secure (HTTPS)"}
                icon={site.secure ? Icon.LockUnlocked : Icon.Lock}
                onAction={() => toggleSecure(site.name, site.secure)}
              />
              <ActionPanel.Submenu title="Set PHP Version" icon={Icon.Code}>
                {(phpData?.installed ?? []).map((v) => (
                  <Action
                    key={v}
                    title={`PHP ${v}${v === site.php ? " ✓" : ""}`}
                    onAction={() => setPhp(site.name, v)}
                  />
                ))}
                {phpData?.default && (
                  <Action
                    title={`Use Global Default (${phpData.default})`}
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() =>
                      useGlobalDefault(site.name, phpData.default)
                    }
                  />
                )}
              </ActionPanel.Submenu>
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title="Manage Domains"
                icon={Icon.Globe}
                target={
                  <DomainsView site={site.name} tld={report?.tld ?? "test"} />
                }
              />
              {tunnelAvailable && (
                <Action
                  title="Share Via Cloudflare Tunnel"
                  icon={Icon.Link}
                  onAction={() => shareTunnel(site.name)}
                />
              )}
              {tunnelAvailable && (
                <Action
                  title="Stop Tunnel Share"
                  icon={Icon.XMarkCircle}
                  onAction={() => stopTunnel(site.name)}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              {site.kind === "linked" && (
                <Action
                  title="Unlink Site"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => unlinkSite(site.name)}
                />
              )}
              {site.kind === "parked" && (
                <Action
                  title="Unpark Directory"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => unparkSite(site.name)}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidateSites}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sites…"
      isShowingDetail
    >
      {linkedSites.length > 0 && (
        <List.Section title="Linked">
          {linkedSites.map(renderSiteItem)}
        </List.Section>
      )}
      <List.Section title="Parked">
        {parkedSites.map(renderSiteItem)}
      </List.Section>
    </List>
  );
}
