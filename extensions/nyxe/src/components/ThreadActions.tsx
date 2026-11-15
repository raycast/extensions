import { useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard } from "@raycast/api";
import type { Tag } from "../lib/api";
import { nyxe, openThreadInNyxe, showApiError, withToast } from "../lib/raycast";
import { snoozePresets } from "../lib/snooze";

/**
 * The actions every thread row offers, in Search Mail and Inbox. Anything that
 * changes the thread shows a toast and then calls `onChanged` so the list
 * revalidates.
 */
export function ThreadActions({
  threadId,
  subject,
  isUnread,
  senderEmail,
  onChanged,
  extra,
}: {
  threadId: string;
  subject: string | null;
  /** Unknown (a search hit) offers both read actions. */
  isUnread?: boolean;
  senderEmail?: string | null;
  onChanged?: () => void;
  /** View-specific actions (e.g. toggle detail), shown after the defaults. */
  extra?: React.ReactNode;
}) {
  const changed = (ok: boolean) => {
    if (ok) onChanged?.();
  };
  const label = subject?.trim() || "thread";

  return (
    <ActionPanel title={label}>
      <ActionPanel.Section>
        <Action
          title="Open in Nyxe"
          icon={Icon.Envelope}
          onAction={() => openThreadInNyxe(threadId).catch((err) => showApiError(err, "Couldn't open the thread"))}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Archive"
          icon={Icon.Tray}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={async () =>
            changed(
              await withToast({ loading: "Archiving…", success: "Archived", failure: "Couldn't archive" }, () =>
                nyxe().archive(threadId),
              ),
            )
          }
        />
        {isUnread !== false ? (
          <Action
            title="Mark as Read"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            onAction={async () =>
              changed(
                await withToast(
                  { loading: "Marking as read…", success: "Marked as read", failure: "Couldn't mark as read" },
                  () => nyxe().markRead(threadId, true),
                ),
              )
            }
          />
        ) : null}
        {isUnread !== true ? (
          <Action
            title="Mark as Unread"
            icon={Icon.EyeDisabled}
            shortcut={isUnread === false ? { modifiers: ["cmd", "shift"], key: "u" } : undefined}
            onAction={async () =>
              changed(
                await withToast(
                  { loading: "Marking as unread…", success: "Marked as unread", failure: "Couldn't mark as unread" },
                  () => nyxe().markRead(threadId, false),
                ),
              )
            }
          />
        ) : null}
        <ActionPanel.Submenu title="Snooze" icon={Icon.Clock} shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}>
          {snoozePresets().map((preset) => (
            <Action
              key={preset.id}
              title={preset.title}
              onAction={async () =>
                changed(
                  await withToast(
                    {
                      loading: "Snoozing…",
                      success: `Snoozed until ${formatWake(preset.wakeAt)}`,
                      failure: "Couldn't snooze",
                    },
                    () => nyxe().snooze(threadId, preset.wakeAt),
                  ),
                )
              }
            />
          ))}
        </ActionPanel.Submenu>
        <TagSubmenu threadId={threadId} onChanged={onChanged} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {senderEmail ? (
          <Action.CopyToClipboard
            title="Copy Sender Address"
            content={senderEmail}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        ) : null}
        {extra}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function formatWake(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Tags load when the submenu opens: the list is small, but a row that never
 *  opens its submenu shouldn't cost two requests. */
function TagSubmenu({ threadId, onChanged }: { threadId: string; onChanged?: () => void }) {
  const [state, setState] = useState<{ all: Tag[]; on: Set<string> } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [all, current] = await Promise.all([nyxe().tags(), nyxe().threadTags(threadId)]);
      setState({ all, on: new Set(current.map((t) => t.id)) });
    } catch (err) {
      await showApiError(err, "Couldn't load tags");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ActionPanel.Submenu
      title="Tag"
      icon={Icon.Tag}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      isLoading={loading}
      onOpen={load}
    >
      {state?.all.length === 0 ? <Action title="No Tags yet. Create Them in Nyxe" /> : null}
      {state?.all.map((tag) => {
        const on = state.on.has(tag.id);
        return (
          <Action
            key={tag.id}
            title={tag.name}
            icon={
              on
                ? { source: Icon.CheckCircle, tintColor: tag.color || Color.PrimaryText }
                : { source: Icon.Circle, tintColor: tag.color || Color.SecondaryText }
            }
            onAction={async () => {
              const ok = await withToast(
                {
                  loading: on ? `Removing ${tag.name}…` : `Adding ${tag.name}…`,
                  success: on ? `Removed ${tag.name}` : `Tagged ${tag.name}`,
                  failure: "Couldn't change the tag",
                },
                () => nyxe().setTag(threadId, tag.id, !on),
              );
              if (ok) {
                setState((prev) => {
                  if (!prev) return prev;
                  const next = new Set(prev.on);
                  if (on) next.delete(tag.id);
                  else next.add(tag.id);
                  return { ...prev, on: next };
                });
                onChanged?.();
              }
            }}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}
