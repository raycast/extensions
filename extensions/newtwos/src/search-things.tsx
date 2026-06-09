import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { api, listWebUrl, TwosThing } from "./api";

export default function SearchThings() {
  const [query, setQuery] = useState("");
  const [things, setThings] = useState<TwosThing[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    const path = query.trim()
      ? `/search?query=${encodeURIComponent(query.trim())}`
      : `/things?sort=created`;
    (async () => {
      try {
        const data = await api<{ things?: TwosThing[] }>(path);
        if (id === seq.current) setThings(data.things || []);
      } catch (e) {
        if (id === seq.current) {
          setThings([]);
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
      setThings((prev) =>
        prev.map((t) => (t.id === thing.id ? { ...t, completed } : t)),
      );
      toast.style = Toast.Style.Success;
      toast.title = completed ? "Completed" : "Reopened";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't update";
      toast.message = String(e);
    }
  }

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search your things…"
      throttle
    >
      {things.map((thing) => (
        <List.Item
          key={thing.id}
          icon={
            thing.completed
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : thing.type === "todo"
                ? Icon.Circle
                : Icon.Dot
          }
          title={thing.text || "(empty)"}
          accessories={thing.tags?.map((t) => ({ tag: `#${t}` })) || []}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={listWebUrl(thing.list_id)}
                title="Open List in Twos"
              />
              {thing.type === "todo" &&
                (thing.completed ? (
                  <Action
                    title="Mark Incomplete"
                    icon={Icon.Circle}
                    onAction={() => setCompleted(thing, false)}
                  />
                ) : (
                  <Action
                    title="Mark Complete"
                    icon={Icon.CheckCircle}
                    onAction={() => setCompleted(thing, true)}
                  />
                ))}
              <Action.CopyToClipboard content={thing.text} title="Copy Text" />
              {thing.url ? (
                <Action.OpenInBrowser url={thing.url} title="Open Hyperlink" />
              ) : null}
            </ActionPanel>
          }
        />
      ))}
      {!loading && things.length === 0 && (
        <List.EmptyView title="No things found" icon={Icon.MagnifyingGlass} />
      )}
    </List>
  );
}
