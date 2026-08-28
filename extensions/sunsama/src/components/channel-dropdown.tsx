import { Action, Form, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Channel } from "../lib/types";
import { loadChannels, refreshChannels } from "../lib/sunsama-client";
import { reportError, runWithToast } from "../lib/errors";

export interface Channels {
  list: Channel[];
  isLoading: boolean;
  /** Whether there is a list to render yet — see the comment below. */
  ready: boolean;
  /** Re-sweep the server and replace the stored list. */
  refresh: () => Promise<void>;
}

/**
 * The channel list, shared by every picker.
 *
 * Reading it is cheap: the expensive sweep runs once and the result is stored,
 * so this normally just reads it back. That's why it's safe for a command to
 * call on every launch. Use `refresh` to pick up channels added since.
 */
export function useChannels(): Channels {
  const { data, isLoading, revalidate } = useCachedPromise(loadChannels, [], {
    onError: (error) => reportError(error, "Failed to load channels"),
  });

  return {
    list: data ?? [],
    isLoading,
    // `useCachedPromise` hands back cached data on the first render while it
    // revalidates, so `data` being set — not `isLoading` being false — is the
    // signal that there's a list to render. Checking `data` rather than its
    // length also keeps this right for an account with no channels at all.
    ready: data !== undefined || !isLoading,
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
  /** A channel name that must be selectable even if it isn't in the list. */
  ensureName?: string;
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
 * The whole list is handed to Raycast so Raycast does the filtering. Searching
 * the server per keystroke instead would rank results semantically — typing an
 * exact channel name returns it alongside 24 loosely related ones, and the top
 * match often isn't the one you typed.
 *
 * The empty value leaves the task with no channel. `create_task` documents a
 * channel-prediction fallback for that case, but it does not fire on this path
 * — a task created without a channel comes back with no channel set — so the
 * option is labeled for what actually happens.
 */
export function ChannelDropdown({
  channels,
  ensureName,
  allowNone = true,
  title,
  ...dropdownProps
}: Props) {
  const { list, isLoading, ready } = channels;

  // A task can sit in a channel the sweep didn't surface; keep it selectable
  // so opening the form doesn't silently reassign it.
  const known = new Set(list.map((ch) => ch.name));
  const missing = ensureName && !known.has(ensureName) ? ensureName : null;

  return (
    <Form.Dropdown
      {...dropdownProps}
      title={title ?? "Channel"}
      isLoading={isLoading}
    >
      {/* Shown as soon as there is a list to sit on top of, so the dropdown
          never opens on a lone "No channel" that the rest then shifts. */}
      {ready && allowNone && <Form.Dropdown.Item value="" title="No channel" />}
      {missing && <Form.Dropdown.Item value={missing} title={missing} />}
      {list.map((ch) => (
        <Form.Dropdown.Item
          key={ch.id}
          value={ch.name}
          // A category can hold tasks of its own, so it appears alongside the
          // channels inside it and is searchable by its own name.
          title={ch.isCategory ? `${ch.name} (category)` : ch.name}
          keywords={ch.categoryName ? [ch.categoryName] : undefined}
        />
      ))}
    </Form.Dropdown>
  );
}
