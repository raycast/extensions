import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDefaultChannel, setDefaultChannel } from "./lib/sunsama-client";
import {
  RefreshChannelsAction,
  useChannels,
} from "./components/channel-dropdown";
import { matchesChannel, matchesNoChannel } from "./lib/channels";
import { reportError } from "./lib/errors";

export default function SetDefaultChannel() {
  const channels = useChannels();
  const { list, isLoading, ready, query, onSearchTextChange } = channels;
  // Filtered here, not by Raycast: handling the search text so the server can
  // be asked about channels the stored list is missing turns Raycast's own
  // filtering off.
  const visible = list.filter((ch) => matchesChannel(ch, query));
  const { data: current } = useCachedPromise(getDefaultChannel, []);

  async function choose(id: string, name: string) {
    try {
      await setDefaultChannel(id ? { id, name } : null);
      // Close and go back to root, rather than following the user's "Pop to
      // Root Search" preference and leaving this list on the stack.
      await showHUD(
        id ? `Default channel: ${name}` : "Default channel cleared",
        {
          popToRootType: PopToRootType.Immediate,
          clearRootSearch: true,
        },
      );
    } catch (error) {
      await reportError(error, "Failed to save default channel");
    }
  }

  function itemActions(id: string, name: string) {
    return (
      <ActionPanel>
        <Action
          title="Set as Default"
          icon={Icon.Check}
          onAction={() => choose(id, name)}
        />
        <RefreshChannelsAction channels={channels} />
      </ActionPanel>
    );
  }

  const selected = (id: string): List.Item.Accessory[] =>
    (current?.id ?? "") === id
      ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green } }]
      : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={isLoading ? "Loading channels…" : "Search channels"}
      // Off deliberately: the typed text has to reach the server to find a
      // channel the stored list is missing, and handling it means filtering
      // here instead — see `visible` above.
      onSearchTextChange={onSearchTextChange}
      filtering={false}
    >
      {/* Shown as soon as there is a list to sit on top of. useCachedPromise
          returns the cached channels on the first render, so normally this
          appears with them and nothing shifts; on a cold start the whole set
          arrives at once instead of a lone "No channel" row. */}
      {ready && matchesNoChannel(query) && (
        <List.Item
          title="No channel"
          subtitle="New tasks start without a channel"
          accessories={selected("")}
          actions={itemActions("", "No channel")}
        />
      )}
      {visible.map((ch) => (
        <List.Item
          key={ch.id}
          title={ch.name}
          // Categories hold tasks of their own, so they're listed too.
          subtitle={ch.isCategory ? "Category" : (ch.categoryName ?? undefined)}
          accessories={selected(ch.id)}
          actions={itemActions(ch.id, ch.name)}
        />
      ))}
    </List>
  );
}
