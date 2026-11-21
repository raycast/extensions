import { Action, ActionPanel, Color, Icon, Image, List, openExtensionPreferences, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { dashboardUrl, SiteWithStats, trackingSnippet } from "./api";
import { formatChange, formatNumber, sparkline } from "./format";
import { getClient } from "./preferences";
import SiteStats from "./site-stats";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => getClient().sitesWithStats(), [], {
    onError: (e) => {
      showFailureToast(e, { title: "Could not load your sites" });
    },
  });

  const workspaces = [...new Set((data ?? []).map((s) => s.workspaceName))];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your sites">
      {error && !data ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load your sites"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Get a Free Account" url="https://privatusanalytics.com/users/sign_up" />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon="extension-icon.png"
          title="No sites yet"
          description="Add a site in Privatus Analytics, then come back here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Privatus Analytics" url={dashboardUrl()} />
            </ActionPanel>
          }
        />
      )}
      {workspaces.map((ws) => (
        <List.Section key={ws} title={workspaces.length > 1 ? ws : "Sites"} subtitle="Visitors in the last 30 days">
          {(data ?? [])
            .filter((s) => s.workspaceName === ws)
            .map((site) => (
              <SiteItem key={site.id} site={site} onRefresh={revalidate} />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function SiteItem({ site, onRefresh }: { site: SiteWithStats; onRefresh: () => void }) {
  const { stats } = site;
  const accessories: List.Item.Accessory[] = [];
  if (stats.live && stats.live > 0) {
    accessories.push({ tag: { value: `${stats.live} live`, color: Color.Green }, tooltip: "Visitors right now" });
  }
  const spark = sparkline(stats.sparkline);
  if (spark) accessories.push({ text: spark, tooltip: "Daily visitors, last 14 days" });
  const change = formatChange(stats.change);
  if (change) {
    accessories.push({
      text: { value: change, color: (stats.change ?? 0) >= 0 ? Color.Green : Color.Red },
      tooltip: "Change from the 30 days before",
    });
  }
  accessories.push({ text: formatNumber(stats.visitors ?? 0), icon: Icon.TwoPeople, tooltip: "Visitors, 30 days" });

  const icon: Image.ImageLike = stats.icon
    ? { source: stats.icon, fallback: Icon.Globe, mask: Image.Mask.RoundedRectangle }
    : Icon.Globe;

  return (
    <List.Item
      title={site.name || site.domain}
      subtitle={site.name && site.name !== site.domain ? site.domain : undefined}
      keywords={[site.domain, site.id]}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Show Stats" icon={Icon.BarChart} target={<SiteStats site={site} />} />
          <Action.OpenInBrowser title="Open in Privatus Analytics" url={dashboardUrl(site.id)} />
          <Action.OpenInBrowser
            title="Open Website"
            url={`https://${site.domain}`}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.CopyToClipboard title="Copy Site ID" content={site.id} shortcut={Keyboard.Shortcut.Common.CopyName} />
          <Action.CopyToClipboard
            title="Copy Tracking Code"
            content={trackingSnippet(site.id)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
