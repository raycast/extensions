import { countOf } from "@chrismessina/raycast-kit";
import { Action, ActionPanel, Color, Detail, Icon, Keyboard, useNavigation } from "@raycast/api";
import { Entry, Journal } from "../lib/api";
import { IS_MAC } from "../lib/cli";
import { cleanBody, mapsUrl, placeLabel, timeZoneOrUndefined } from "../lib/parse";

/** A filter picked from an entry's actions: one of its tags, or its place. */
export type Filter = { kind: "tag"; value: string } | { kind: "place"; value: string };

export function journalIcon(journal?: Journal) {
  return { source: Icon.Book, tintColor: journal?.color ?? Color.SecondaryText };
}

export function formatDate(entry: Entry, options: Intl.DateTimeFormatOptions): string {
  // Search results are cached across launches, so an entry here may not have come through `toEntry`'s check.
  return new Date(entry.date).toLocaleString(undefined, { timeZone: timeZoneOrUndefined(entry.timeZone), ...options });
}

export function mediaLabel(entry: Entry): string | undefined {
  const parts = [];
  if (entry.photos) parts.push(countOf(entry.photos, "photo"));
  if (entry.audio) parts.push(countOf(entry.audio, "recording"));
  return parts.length ? parts.join(", ") : undefined;
}

export function entryDeepLink(entry: Entry): string {
  return `dayone://view?entryId=${encodeURIComponent(entry.id)}`;
}

/** Journal, date, place, media and tags. Shared by the list's sidebar and the full entry view. */
export function EntryMetadata(props: { entry: Entry; journal?: Journal; M: typeof Detail.Metadata }) {
  const { entry, journal, M } = props;
  const place = entry.place ? placeLabel(entry.place) : "";
  const map = entry.place ? mapsUrl(entry.place, process.platform) : undefined;
  const media = mediaLabel(entry);
  return (
    <M>
      <M.Label title="Journal" text={journal?.name ?? "Unknown"} icon={journalIcon(journal)} />
      <M.Label title="Date" text={formatDate(entry, { dateStyle: "long", timeStyle: "short" })} />
      {place && (map ? <M.Link title="Place" text={place} target={map} /> : <M.Label title="Place" text={place} />)}
      {media && (
        <M.Label title="Media" text={IS_MAC ? `${media} · open in Day One to see them` : media} icon={Icon.Image} />
      )}
      {entry.tags.length > 0 && (
        <M.TagList title="Tags">
          {entry.tags.map((tag) => (
            <M.TagList.Item key={tag} text={tag} />
          ))}
        </M.TagList>
      )}
    </M>
  );
}

/** Open, copy and paste. `goTo` adds Go to Entry, for the list; the entry view leaves it out. */
export function EntryOpenActions(props: {
  entry: Entry;
  journal?: Journal;
  goTo?: boolean;
  onFilter?: (filter: Filter) => void;
}) {
  const { entry, journal, goTo, onFilter } = props;
  const body = cleanBody(entry.body);
  const deepLink = entryDeepLink(entry);
  const goToAction = goTo && (
    <Action.Push
      title="Go to Entry"
      icon={Icon.Document}
      target={<EntryDetail entry={entry} journal={journal} onFilter={onFilter} />}
    />
  );
  return (
    <ActionPanel.Section>
      {/* Without the Day One app (Windows), reading the entry here is the main thing to do with it. */}
      {!IS_MAC && goToAction}
      {IS_MAC && <Action.Open title="Open in Day One" icon={Icon.Book} target={deepLink} />}
      {IS_MAC && goToAction}
      <Action.CopyToClipboard title="Copy Entry Text" content={body} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.Paste title="Paste Entry Text" content={body} />
      {IS_MAC && (
        <Action.CopyToClipboard
          title="Copy Entry Link"
          content={deepLink}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "l" },
            Windows: { modifiers: ["ctrl", "shift"], key: "l" },
          }}
        />
      )}
    </ActionPanel.Section>
  );
}

/** Tag and place filters, plus Maps. `onFilter` is the list's; from the entry view it returns to the list first. */
export function EntryFilterActions(props: { entry: Entry; onFilter?: (filter: Filter) => void }) {
  const { entry, onFilter } = props;
  const map = entry.place ? mapsUrl(entry.place, process.platform) : undefined;
  return (
    <ActionPanel.Section>
      {onFilter && entry.tags.length > 0 && (
        <ActionPanel.Submenu title="Filter by Tag" icon={Icon.Tag}>
          {entry.tags.map((tag) => (
            <Action key={tag} title={tag} icon={Icon.Tag} onAction={() => onFilter({ kind: "tag", value: tag })} />
          ))}
        </ActionPanel.Submenu>
      )}
      {onFilter && entry.place?.name && (
        <Action
          title={`Show Entries at ${entry.place.name}`}
          icon={Icon.Pin}
          onAction={() => onFilter({ kind: "place", value: entry.place?.name ?? "" })}
        />
      )}
      {map && <Action.OpenInBrowser title="Open in Maps" icon={Icon.Map} url={map} />}
    </ActionPanel.Section>
  );
}

/** The whole entry, readable in Raycast: for anyone without the Day One app, or who just wants to read. */
export function EntryDetail(props: { entry: Entry; journal?: Journal; onFilter?: (filter: Filter) => void }) {
  const { entry, journal, onFilter } = props;
  const { pop } = useNavigation();
  const body = cleanBody(entry.body);
  return (
    <Detail
      navigationTitle={entry.title}
      markdown={body || "*This entry has no text.*"}
      metadata={<EntryMetadata entry={entry} journal={journal} M={Detail.Metadata} />}
      actions={
        <ActionPanel title={entry.title}>
          <EntryOpenActions entry={entry} journal={journal} />
          <EntryFilterActions
            entry={entry}
            onFilter={
              onFilter &&
              ((filter) => {
                pop();
                onFilter(filter);
              })
            }
          />
        </ActionPanel>
      }
    />
  );
}
