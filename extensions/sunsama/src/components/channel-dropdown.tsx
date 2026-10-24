import { Action, Form, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { Channel } from "../lib/types";
import {
  loadChannels,
  refreshChannels,
  rememberChannels,
  searchChannels,
} from "../lib/sunsama-client";
import { matchesChannel, matchesNoChannel } from "../lib/channels";
import { reportError, runWithToast } from "../lib/errors";

export interface Channels {
  list: Channel[];
  isLoading: boolean;
  /** Whether there is a list to render yet — see the comment below. */
  ready: boolean;
  /** What's currently typed, for the picker to narrow its own items with. */
  query: string;
  /** Feed the picker's search text in, so the server can be asked too. */
  onSearchTextChange: (text: string) => void;
  /** Re-sweep the server and replace the stored list. */
  refresh: () => Promise<void>;
}

/**
 * The channel list, shared by every picker.
 *
 * Two sources, merged. The stored list is swept once and reused, so opening a
 * picker is cheap. On top of that, whatever is typed is also sent to the
 * server: `search_channels` ranks semantically, returns at most 25, and has no
 * pagination, so no sweep can be guaranteed complete — but an exact name ranks
 * first, so searching what the user typed always reaches the channel they
 * mean. Anything new that turns up is added to the stored list.
 */
export function useChannels(): Channels {
  const [query, setQuery] = useState("");
  // Filtering runs off `query` so it keeps up with typing; only the server
  // lookup waits, which is what the delay is actually for. Throttling the
  // search text itself would hold the filter back too.
  const [settled, setSettled] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSettled(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const { data, isLoading, revalidate } = useCachedPromise(loadChannels, [], {
    onError: (error) => reportError(error, "Failed to load channels"),
  });

  const stored = useMemo(() => data ?? [], [data]);

  // Ask the server only when nothing stored matches what was typed. Searching
  // on every keystroke means results arriving mid-type, which reshuffles the
  // list under the cursor; this way the stored list answers almost everything
  // and the server is a fallback for what the sweep couldn't reach.
  const text = settled.trim();
  const missingLocally = useMemo(
    () => text.length >= 2 && !stored.some((c) => matchesChannel(c, text)),
    [stored, text],
  );

  const { data: found, isLoading: isSearching } = useCachedPromise(
    searchChannels,
    [text],
    {
      execute: missingLocally,
      keepPreviousData: true,
      // A failed lookup just means no extra results; the stored list still
      // shows.
      onError: () => undefined,
    },
  );

  // Everything the server returned is a real channel, so it all goes into
  // storage and widens the list for next time.
  useEffect(() => {
    if (found?.length) void rememberChannels(found);
  }, [found]);

  // Merged as-is; the pickers narrow it themselves with `matchesChannel`.
  const list = useMemo(() => {
    const byId = new Map(stored.map((c) => [c.id, c]));
    for (const channel of found ?? []) byId.set(channel.id, channel);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [stored, found]);

  return {
    list,
    // Only when there is genuinely nothing to show yet — the first sweep — or
    // a server lookup is in flight. Re-reading stored channels on each launch
    // also flips `isLoading`, and flagging that would show a loading state
    // over a list that is already complete.
    isLoading: (isLoading && data === undefined) || isSearching,
    // `useCachedPromise` hands back cached data on the first render while it
    // revalidates, so `data` being set — not `isLoading` being false — is the
    // signal that there's a list to render. Checking `data` rather than its
    // length also keeps this right for an account with no channels at all.
    ready: data !== undefined || !isLoading,
    query,
    onSearchTextChange: setQuery,
    refresh: async () => {
      const ok = await runWithToast(
        {
          pending: "Refreshing channels…",
          success: "Channels refreshed",
          failure: "Failed to refresh channels",
        },
        refreshChannels,
      );
      if (ok) revalidate();
    },
  };
}

/** The action that re-sweeps the channel list, for a command's action panel. */
export function RefreshChannelsAction({ channels }: { channels: Channels }) {
  return (
    <Action
      title="Refresh Channels"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={channels.refresh}
    />
  );
}

/** Accepts every Form item prop, so `useForm`'s itemProps can be spread in. */
interface Props extends Partial<Form.ItemProps<string>> {
  id: string;
  channels: Channels;
  /**
   * Whether "No channel" can be picked. The server has no way to take a task
   * out of a channel — `add_task_to_channel` rejects an empty name and there is
   * no remove tool — so a task that already has one must not be offered it.
   */
  allowNone?: boolean;
}

/**
 * A channel picker.
 *
 * Filtering is done here rather than by Raycast. Reaching a channel the stored
 * list is missing means sending the query to the server, and handling the
 * search text switches Raycast's own filtering off — so `filtering` is false
 * and the list is narrowed with `matchesChannel`.
 */
export function ChannelDropdown({
  channels,
  allowNone = true,
  title,
  ...dropdownProps
}: Props) {
  const { list, isLoading, ready, query, onSearchTextChange } = channels;

  const visible = list.filter((ch) => matchesChannel(ch, query));

  // A task can sit in a channel the sweep never surfaced, so the selected one
  // gets an item of its own when the list has none — otherwise opening the
  // form would silently reassign it. It is filtered like any other item; a
  // selection the query excludes just isn't shown, same as Raycast's own
  // filtering, and the value survives.
  const selected = dropdownProps.value ?? dropdownProps.defaultValue ?? "";
  const missing =
    selected && !list.some((ch) => ch.name === selected) ? selected : null;

  return (
    <Form.Dropdown
      {...dropdownProps}
      title={title ?? "Channel"}
      isLoading={isLoading}
      // Says why the list is short instead of leaving it looking empty.
      placeholder={isLoading ? "Loading channels…" : "Search channels"}
      onSearchTextChange={onSearchTextChange}
      filtering={false}
    >
      {/* Shown as soon as there is a list to sit on top of, so the dropdown
          never opens on a lone "No channel" that the rest then shifts. */}
      {ready && allowNone && matchesNoChannel(query) && (
        <Form.Dropdown.Item value="" title="No channel" />
      )}
      {missing && matchesChannel({ id: missing, name: missing }, query) && (
        <Form.Dropdown.Item value={missing} title={missing} />
      )}
      {visible.map((ch) => (
        <Form.Dropdown.Item
          key={ch.id}
          value={ch.name}
          // A category can hold tasks of its own, so it appears alongside the
          // channels inside it.
          title={ch.isCategory ? `${ch.name} (category)` : ch.name}
        />
      ))}
    </Form.Dropdown>
  );
}
