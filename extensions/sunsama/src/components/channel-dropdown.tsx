import { Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAllChannels } from "../lib/sunsama-client";
import { reportError } from "../lib/errors";

/** Accepts every Form item prop, so `useForm`'s itemProps can be spread in. */
interface Props extends Partial<Form.ItemProps<string>> {
  id: string;
  /** A channel name that must be selectable even if it isn't in the list. */
  ensureName?: string;
}

/**
 * A channel picker.
 *
 * The list is fetched once and handed to Raycast whole, so Raycast does the
 * filtering. Searching the server per keystroke instead would rank results
 * semantically — typing an exact channel name returns it alongside 24 loosely
 * related ones, and the top match often isn't the one you typed.
 *
 * The empty value leaves the task with no channel. `create_task` documents a
 * channel-prediction fallback for that case, but it does not fire on this path
 * — a task created without a channel comes back with no channel set — so the
 * option is labeled for what actually happens.
 */
export function ChannelDropdown({
  ensureName,
  title,
  ...dropdownProps
}: Props) {
  const { data, isLoading } = useCachedPromise(getAllChannels, [], {
    onError: (error) => reportError(error, "Failed to load channels"),
  });
  const channels = data ?? [];

  // A task can sit in a channel the search didn't surface; keep it selectable
  // so opening the form doesn't silently reassign it.
  const known = new Set(channels.map((ch) => ch.name));
  const missing = ensureName && !known.has(ensureName) ? ensureName : null;
  // `useCachedPromise` hands back cached data on the first render while it
  // revalidates, so `data` being set — not `isLoading` being false — is the
  // signal that there's a list to render. Checking `data` rather than its
  // length also keeps this right for an account with no channels at all.
  const ready = data !== undefined || !isLoading;

  return (
    <Form.Dropdown
      {...dropdownProps}
      title={title ?? "Channel"}
      isLoading={isLoading}
    >
      {/* Shown as soon as there is a list to sit on top of. useCachedPromise
          returns the cached channels on the first render, so normally this
          appears with them and nothing shifts; on a cold start the whole set
          arrives at once instead of "No channel" alone, then the rest. */}
      {ready && <Form.Dropdown.Item value="" title="No channel" />}
      {missing && <Form.Dropdown.Item value={missing} title={missing} />}
      {channels.map((ch) => (
        <Form.Dropdown.Item
          key={ch.id}
          value={ch.name}
          title={ch.name}
          keywords={ch.categoryName ? [ch.categoryName] : undefined}
        />
      ))}
    </Form.Dropdown>
  );
}
