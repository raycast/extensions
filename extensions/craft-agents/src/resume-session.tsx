import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { buildAction, buildSessionLink } from "./lib/deeplink";
import { getPrefs } from "./lib/preferences";
import { listSessions } from "./lib/sessions";
import type { SessionRecord } from "./lib/sessions.schema";
import { logger } from "./lib/logger";

function formatRelative(date: Date | undefined): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString();
}

function subtitle(rec: SessionRecord): string {
  const parts: string[] = [];
  if (rec.labels.length) parts.push(rec.labels.join(" · "));
  if (rec.status) parts.push(rec.status);
  return parts.join("  ");
}

async function openSession(id: string): Promise<void> {
  try {
    await open(buildSessionLink(id));
  } catch (err) {
    logger.error("resume-session.open_failed", err, { id });
    await showFailureToast(err, { title: "Failed to open session" });
  }
}

async function toggleFlag(id: string, currentlyFlagged: boolean, onDone: () => void): Promise<void> {
  const action = currentlyFlagged ? "unflag-session" : "flag-session";
  try {
    await open(buildAction(action, id));
    await showToast({ style: Toast.Style.Success, title: currentlyFlagged ? "Unflagged" : "Flagged" });
    onDone();
  } catch (err) {
    await showFailureToast(err, { title: "Action failed" });
  }
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const prefs = getPrefs();
      return listSessions(prefs.workspaceRoot);
    },
    [],
    { keepPreviousData: true },
  );

  const records = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by name, id, or label">
      {records.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No sessions found"
          description="Check the Workspace Root preference points to your Craft Agents workspace."
        />
      ) : null}
      {records.map((rec) => (
        <List.Item
          key={rec.id}
          title={rec.displayName}
          subtitle={subtitle(rec)}
          icon={rec.flagged ? Icon.Star : Icon.Bubble}
          accessories={[{ text: formatRelative(rec.updatedAt) }, { tag: rec.id }]}
          keywords={[rec.id, ...rec.labels]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Craft Agents"
                icon={Icon.ArrowRight}
                onAction={() => openSession(rec.id)}
              />
              <Action
                title={rec.flagged ? "Unflag" : "Flag"}
                icon={rec.flagged ? Icon.StarDisabled : Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => toggleFlag(rec.id, rec.flagged, revalidate)}
              />
              <Action.CopyToClipboard
                title="Copy Session Id"
                content={rec.id}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.CopyToClipboard title="Copy Deep Link" content={buildSessionLink(rec.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
