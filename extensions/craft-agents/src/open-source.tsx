import { Action, ActionPanel, Icon, List, Toast, open, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { buildAction, buildSourceLink } from "./lib/deeplink";
import { logger } from "./lib/logger";
import { getPrefs } from "./lib/preferences";
import { listSources, type SourceRecord } from "./lib/sources";

function subtitle(rec: SourceRecord): string {
  return rec.description ?? [rec.provider, rec.type].filter(Boolean).join(" · ");
}

async function openSource(slug: string): Promise<void> {
  try {
    await open(buildSourceLink(slug));
  } catch (err) {
    logger.error("open-source.open_failed", err, { slug });
    await showFailureToast(err, { title: "Failed to open source" });
  }
}

async function triggerOAuth(slug: string): Promise<void> {
  try {
    await open(buildAction("oauth", slug));
    await showToast({ style: Toast.Style.Success, title: "OAuth flow triggered" });
  } catch (err) {
    await showFailureToast(err, { title: "OAuth trigger failed" });
  }
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      const prefs = getPrefs();
      return listSources(prefs.workspaceRoot);
    },
    [],
    { keepPreviousData: true },
  );

  const records = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter sources">
      {records.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Plug}
          title="No sources found"
          description="Check the Workspace Root preference and that sources/ exists."
        />
      ) : null}
      {records.map((rec) => (
        <List.Item
          key={rec.slug}
          title={rec.displayName}
          subtitle={subtitle(rec)}
          icon={rec.active ? Icon.Plug : Icon.MinusCircle}
          accessories={rec.type ? [{ tag: rec.type }] : undefined}
          keywords={[rec.slug, rec.provider ?? ""].filter(Boolean)}
          actions={
            <ActionPanel>
              <Action
                title="Open in Craft Agents"
                icon={Icon.ArrowRight}
                onAction={() => openSource(rec.slug)}
              />
              <Action
                title="Trigger Oauth"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => triggerOAuth(rec.slug)}
              />
              <Action.CopyToClipboard title="Copy Slug" content={rec.slug} />
              <Action.CopyToClipboard title="Copy Deep Link" content={buildSourceLink(rec.slug)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
