import {
  MenuBarExtra,
  Icon,
  Color,
  open,
  getPreferenceValues,
  openExtensionPreferences,
  Cache,
  environment,
  LaunchType,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { fetchReviewRequests, notifyError, webSearchURL } from "./api";
import type { Preferences, ReviewRequest } from "./types";

function relativeTime(iso: string): string {
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  const y = Math.floor(mo / 12);
  return `${y}y`;
}

const cache = new Cache();

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [count, setCount] = useState<number | null>(null);
  const [items, setItems] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async (force = false) => {
    if (!prefs.githubToken) {
      const msg = "Set your GitHub token in the extension preferences.";
      setError(msg);
      setLoading(false);
      return;
    }

    try {
      // Keep UI responsive if we already have data
      setLoading(items.length === 0);
      const cached = cache.get("reviews");

      if (!force && cached && environment.launchType === LaunchType.UserInitiated) {
        const { items, count } = JSON.parse(cached);
        setCount(count);
        setItems(items);
        setError(null);
      } else {
        const res = await fetchReviewRequests({
          graphqlEndpoint: prefs.graphqlEndpoint || "https://api.github.com/graphql",
          token: prefs.githubToken,
          excludeDrafts: prefs.excludeDrafts,
          extraQuery: prefs.extraQuery,
          first: Math.min(Math.max(Number(prefs.maxItems ?? 20), 1), 100),
        });

        setCount(res.count);
        setItems(res.items);
        setError(null);
        cache.set("reviews", JSON.stringify({ count: res.count, items: res.items, timestamp: new Date() }));
      }
    } catch (e) {
      const msg = typeof e?.message === "string" ? e.message : "Unknown error";
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchAll();
  }, [prefs.githubToken, prefs.graphqlEndpoint, prefs.extraQuery, prefs.excludeDrafts, prefs.maxItems]);

  const title = useMemo(() => {
    if (error) return "!";
    if (count === null) return "…";
    if (count > 99) return "99+";
    return String(count);
  }, [count, error]);

  const tooltip = useMemo(() => {
    if (error) return `Error: ${error}`;
    if (count === null) return "Loading review requests…";
    return `${count} review request${count === 1 ? "" : "s"}`;
  }, [count, error]);

  const searchURL = useMemo(
    () =>
      webSearchURL(prefs.graphqlEndpoint || "https://api.github.com/graphql", prefs.excludeDrafts, prefs.extraQuery),
    [prefs.graphqlEndpoint, prefs.excludeDrafts, prefs.extraQuery],
  );

  return (
    <MenuBarExtra
      icon={{ source: Icon.Bubble, tintColor: error ? Color.Red : Color.PrimaryText }}
      title={title}
      tooltip={tooltip}
      isLoading={loading}
    >
      {error ? (
        <>
          <MenuBarExtra.Item
            icon={Icon.ExclamationMark}
            title="Configuration or API Error"
            subtitle={error}
            onAction={() => openExtensionPreferences()}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      {items.length > 0 ? (
        <>
          {items.map((pr) => (
            <MenuBarExtra.Item
              key={pr.id}
              icon={pr.isDraft ? Icon.Circle : Icon.Dot}
              title={`${pr.repo} #${pr.number}`}
              subtitle={`${pr.title} • ${pr.authorLogin} • ${relativeTime(pr.updatedAt)} ago`}
              tooltip={`${pr.title}\n${pr.repo}#${pr.number} • by ${pr.authorLogin}\nUpdated ${relativeTime(pr.updatedAt)} ago`}
              onAction={() => open(pr.url)}
            />
          ))}
          <MenuBarExtra.Separator />
        </>
      ) : (
        !loading && !error && <MenuBarExtra.Item icon={Icon.Checkmark} title="No review requests" />
      )}

      <MenuBarExtra.Item title="Open Search on GitHub" icon={Icon.Globe} onAction={() => open(searchURL)} />
      <MenuBarExtra.Item title="Refresh Now" icon={Icon.RotateClockwise} onAction={() => fetchAll(true)} />
      <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
    </MenuBarExtra>
  );
}
