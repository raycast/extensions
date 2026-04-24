import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { buildAction, buildSessionLink } from "./lib/deeplink";
import { logger } from "./lib/logger";
import { getPrefs } from "./lib/preferences";
import { listSessions } from "./lib/sessions";
import type { SessionRecord } from "./lib/sessions.schema";

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
  return rec.labels.length ? rec.labels.join(" · ") : "";
}

async function openSession(id: string): Promise<void> {
  try {
    await open(buildSessionLink(id));
  } catch (err) {
    logger.error("flagged-sessions.open_failed", err, { id });
    await showFailureToast(err, { title: "Failed to open session" });
  }
}

async function unflag(id: string, onDone: () => void): Promise<void> {
  try {
    await open(buildAction("unflag-session", id));
    await showToast({ style: Toast.Style.Success, title: "Unflagged" });
    onDone();
  } catch (err) {
    await showFailureToast(err, { title: "Unflag failed" });
  }
}

async function deleteSession(id: string, onDone: () => void): Promise<void> {
  const confirmed = await confirmAlert({
    title: "Delete session?",
    message: `This will ask Craft Agents to delete session "${id}".`,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  try {
    await open(buildAction("delete-session", id));
    await showToast({ style: Toast.Style.Success, title: "Delete requested" });
    onDone();
  } catch (err) {
    await showFailureToast(err, { title: "Delete failed" });
  }
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const prefs = getPrefs();
      return listSessions(prefs.workspaceRoot).filter((s) => s.flagged);
    },
    [],
    { keepPreviousData: true },
  );

  const records = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter flagged sessions">
      {records.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Star} title="No flagged sessions" />
      ) : null}
      {records.map((rec) => (
        <List.Item
          key={rec.id}
          title={rec.displayName}
          subtitle={subtitle(rec)}
          icon={Icon.Star}
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
                title="Unflag"
                icon={Icon.StarDisabled}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => unflag(rec.id, revalidate)}
              />
              <Action
                title="Delete Session"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => deleteSession(rec.id, revalidate)}
              />
              <Action.CopyToClipboard title="Copy Session Id" content={rec.id} />
              <Action.CopyToClipboard title="Copy Deep Link" content={buildSessionLink(rec.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
