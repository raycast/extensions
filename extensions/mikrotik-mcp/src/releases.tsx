/**
 * Releases command — browse every published MikroTik MCP version with its notes,
 * and upgrade / downgrade / reinstall the server to a specific version
 * (`bun i -g @usex/mikrotik-mcp@<v>`), which then self-restarts onto it.
 */
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  Keyboard,
} from "@raycast/api";
import { postJson } from "./lib/api";
import { confirmDestructive, showFailureToast } from "./lib/confirm";
import { useApi } from "./lib/hooks";

type Relation = "current" | "newer" | "older";

interface ReleaseItem {
  version: string;
  name: string;
  body: string;
  publishedAt: string;
  url: string;
  prerelease: boolean;
  relation: Relation;
}

interface ReleasesPayload {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releases: ReleaseItem[];
}

interface UpgradeResult {
  ok?: boolean;
  version?: string;
  restarting?: boolean;
  note?: string;
  error?: string;
  log?: string;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function verb(rel: Relation): string {
  return rel === "current"
    ? "Reinstall"
    : rel === "newer"
      ? "Upgrade"
      : "Downgrade";
}

function relIcon(rel: Relation): { source: Icon; tintColor: Color } {
  if (rel === "current")
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (rel === "newer")
    return { source: Icon.ArrowUpCircle, tintColor: Color.Blue };
  return { source: Icon.ArrowDownCircle, tintColor: Color.SecondaryText };
}

export default function Command() {
  const { data, isLoading, revalidate } =
    useApi<ReleasesPayload>("/api/releases");
  const releases = data?.releases ?? [];

  async function install(version: string, relation: Relation): Promise<void> {
    if (
      relation === "older" &&
      !(await confirmDestructive({
        title: `Downgrade the server to v${version}?`,
        message: `Runs \`bun i -g @usex/mikrotik-mcp@${
          version
        }\` on the server, then it restarts onto that version. A newer config may not load on an older build.`,
        actionTitle: "Downgrade",
        icon: Icon.ArrowDownCircle,
      }))
    ) {
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing v${version}…`,
    });
    try {
      const r = await postJson<UpgradeResult>("/api/upgrade", { version });
      if (r?.ok) {
        toast.style = Toast.Style.Success;
        toast.title = `Installed v${r.version}`;
        toast.message = r.restarting
          ? "Restarting on the new version — reconnect shortly."
          : (r.note ?? "");
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Install failed";
        toast.message = r?.error ?? "See the dashboard install log.";
      }
    } catch (e) {
      await showFailureToast(e, {
        title: "Install failed (server unreachable)",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search versions…"
    >
      {data && (
        <List.Section
          title={`Running v${data.currentVersion}`}
          subtitle={
            data.updateAvailable
              ? `Update available → v${data.latestVersion}`
              : "Up to date"
          }
        >
          {releases.map((r) => {
            const isLatest = r.version === data.latestVersion;
            const tags: List.Item.Accessory[] = [];
            if (r.relation === "current")
              tags.push({ tag: { value: "current", color: Color.Green } });
            if (isLatest && r.relation !== "current")
              tags.push({ tag: { value: "latest", color: Color.Blue } });
            if (r.prerelease) tags.push({ tag: "pre-release" });
            return (
              <List.Item
                key={r.version}
                icon={relIcon(r.relation)}
                title={`v${r.version}`}
                subtitle={fmtDate(r.publishedAt)}
                accessories={tags}
                detail={
                  <List.Item.Detail
                    markdown={r.body?.trim() || "_No release notes._"}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={`${verb(r.relation)} to v${r.version}`}
                      icon={relIcon(r.relation)}
                      onAction={() => void install(r.version, r.relation)}
                    />
                    {data.updateAvailable && data.latestVersion && (
                      <Action
                        title={`Upgrade to Latest (v${data.latestVersion})`}
                        icon={Icon.Rocket}
                        onAction={() =>
                          void install(data.latestVersion as string, "newer")
                        }
                      />
                    )}
                    <Action.OpenInBrowser url={r.url} title="Open on GitHub" />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
