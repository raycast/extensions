import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, listWebUrl, TwosList, TwosThing } from "./api";

// Search matches the mobile app's behavior (apps/mobile/components/SearchResults.tsx):
//   - Both lists AND things are shown; lists rank above things.
//   - Things display their parent list as a subtitle, so it's obvious where
//     they live.
//   - When the query matched a thing's URL but not its text (link imports,
//     shared articles), show the URL as an accessory so the user can see why
//     it matched. Mirrors mobile's URL-hint under the row.
//   - Empty query surfaces recent lists (server sorts by lastModified DESC).
//     Mobile calls this the "Recent lists" state; without it, the extension
//     lands the user on a blank screen.
type ListRow = { kind: "list"; list: TwosList };
type ThingRow = {
  kind: "thing";
  thing: TwosThing;
  listTitle: string;
  urlMatched: boolean;
};
type Row = ListRow | ThingRow;

export default function SearchThings() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  // Serial guard against out-of-order responses when the user types quickly.
  // Raycast's `throttle` prop debounces the search-text change, but doesn't
  // protect against a slow request N-1 arriving after a fast request N.
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    const trimmed = query.trim();
    (async () => {
      try {
        if (!trimmed) {
          // Empty state: recent lists. /lists is sorted by lastModified DESC
          // server-side, which is the same signal mobile uses for its
          // "Recent lists" fallback.
          const data = await api<{ lists?: TwosList[] }>("/lists");
          if (id === seq.current) {
            const listRows: Row[] = (data.lists || []).map((l) => ({
              kind: "list",
              list: l,
            }));
            setRows(listRows);
          }
          return;
        }

        // Query present: fetch both. /search returns { lists, things } — the
        // server-side (see apps/web/src/lib/api/v1/operations.ts search()) uses
        // MongoDB $text over the same index the app itself uses, so ranking
        // here matches what the user sees inside Twos.
        const data = await api<{ lists?: TwosList[]; things?: TwosThing[] }>(
          `/search?query=${encodeURIComponent(trimmed)}`,
        );
        if (id !== seq.current) return;

        const lists = data.lists || [];
        const things = data.things || [];

        // Build an id→title map so we can subtitle each thing with its
        // parent list. Falls back to fetching list titles missing from the
        // search response (a thing can match while its list didn't) — but
        // capped at whatever lands in the search-results lists array to keep
        // this one round-trip. Missing titles just render blank.
        const titleById: Record<string, string> = {};
        for (const l of lists) titleById[l.id] = l.title;

        const q = trimmed.toLowerCase();
        const thingRows: ThingRow[] = things.map((t) => {
          const listTitle = t.list_id ? titleById[t.list_id] || "" : "";
          const textLower = (t.text || "").toLowerCase();
          const urlLower = (t.url || "").toLowerCase();
          // urlMatched is the mobile pattern: query hit the URL but not the
          // visible text. Show the URL as an accessory so it's obvious why
          // this row matched. If the text ALSO contains the query, don't
          // bother — the text already shows why.
          const urlMatched = urlLower.length > 0 && urlLower.includes(q) && !textLower.includes(q);
          return { kind: "thing", thing: t, listTitle, urlMatched };
        });
        const listRows: ListRow[] = lists.map((l) => ({
          kind: "list",
          list: l,
        }));

        // Lists first, then things — matches mobile's relevance rule where
        // list matches outrank thing matches.
        setRows([...listRows, ...thingRows]);
      } catch (e) {
        if (id === seq.current) {
          setRows([]);
          await showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: String(e),
          });
        }
      } finally {
        if (id === seq.current) setLoading(false);
      }
    })();
  }, [query]);

  async function setCompleted(thing: TwosThing, completed: boolean) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: completed ? "Completing…" : "Reopening…",
    });
    try {
      await api(`/things/${thing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.kind === "thing" && r.thing.id === thing.id ? { ...r, thing: { ...r.thing, completed } } : r,
        ),
      );
      toast.style = Toast.Style.Success;
      toast.title = completed ? "Completed" : "Reopened";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't update";
      toast.message = String(e);
    }
  }

  const listRows = useMemo(() => rows.filter((r): r is ListRow => r.kind === "list"), [rows]);
  const thingRows = useMemo(() => rows.filter((r): r is ThingRow => r.kind === "thing"), [rows]);

  const emptyStateTitle = query.trim() ? "No results" : "Recent Lists";

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search your things and lists…"
      throttle
    >
      {listRows.length > 0 && (
        <List.Section title={query.trim() ? "Lists" : "Recent Lists"}>
          {listRows.map(({ list }) => (
            <List.Item
              key={`list-${list.id}`}
              icon={Icon.List}
              title={list.emoji ? `${list.emoji}  ${list.title}` : list.title}
              accessories={[{ tag: "List" }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={listWebUrl(list.id)} title="Open List in Twos" />
                  <Action.CopyToClipboard content={list.title} title="Copy Title" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {thingRows.length > 0 && (
        <List.Section title="Things">
          {thingRows.map(({ thing, listTitle, urlMatched }) => (
            <List.Item
              key={`thing-${thing.id}`}
              icon={
                thing.completed
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : thing.type === "todo"
                    ? Icon.Circle
                    : Icon.Dot
              }
              title={thing.text || "(empty)"}
              subtitle={listTitle}
              accessories={[
                ...(urlMatched ? [{ text: thing.url, icon: Icon.Link }] : []),
                ...(thing.tags?.map((t) => ({ tag: `#${t}` })) || []),
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={listWebUrl(thing.list_id)} title="Open List in Twos" />
                  {thing.type === "todo" &&
                    (thing.completed ? (
                      <Action title="Mark Incomplete" icon={Icon.Circle} onAction={() => setCompleted(thing, false)} />
                    ) : (
                      <Action
                        title="Mark Complete"
                        icon={Icon.CheckCircle}
                        onAction={() => setCompleted(thing, true)}
                      />
                    ))}
                  <Action.CopyToClipboard content={thing.text} title="Copy Text" />
                  {thing.url ? <Action.OpenInBrowser url={thing.url} title="Open Hyperlink" /> : null}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!loading && rows.length === 0 && (
        <List.EmptyView
          title={emptyStateTitle}
          description={query.trim() ? `No matches for "${query.trim()}"` : "Start typing to search."}
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
