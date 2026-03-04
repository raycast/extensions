import {
  ActionPanel,
  Action,
  List,
  Icon,
  Image,
  Cache,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getUser, searchRepos, ForgejoRepo } from "./lib/api";
import { getPreferences } from "./lib/preferences";
import { CreateRepoForm } from "./CreateRepoForm";

// --- Cache (sync disk-based, persists between extension launches) ---

const cache = new Cache();
const CACHE_KEY = "forgejo-repos";

function readCache(): ForgejoRepo[] {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ForgejoRepo[];
  } catch {
    return [];
  }
}

async function fetchAndCache(): Promise<ForgejoRepo[]> {
  const { username } = getPreferences();
  const user = await getUser(username);
  const repos = await searchRepos(user.id);
  cache.set(CACHE_KEY, JSON.stringify(repos));
  return repos;
}

// --- Helpers ---

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function repoSubtitle(repo: ForgejoRepo): string {
  const time = relativeTime(repo.updated_at);
  return repo.language
    ? `${repo.language} • updated ${time}`
    : `updated ${time}`;
}

function sshCloneUrl(repo: ForgejoRepo): string {
  const { cloneUrlTemplate } = getPreferences();
  return cloneUrlTemplate
    .replace("{owner}", repo.owner.login)
    .replace("{repo}", repo.name);
}

// --- Component ---

export default function ListRepos() {
  // Lazy initializer: readCache() runs synchronously before the first render.
  // If cache is populated, repos are shown immediately with no flash.
  const [repos, setRepos] = useState<ForgejoRepo[]>(readCache);
  // Only show spinner if there is no cached data at all (true first launch).
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !cache.get(CACHE_KEY),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAndCache()
      .then((data) => {
        setRepos(data);
        setError(null);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        showToast({
          style: Toast.Style.Failure,
          title: msg,
          primaryAction: {
            title: "Open Preferences",
            onAction: openExtensionPreferences,
          },
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Silent background refresh — no spinner since stale data is already visible.
  function revalidate() {
    fetchAndCache()
      .then(setRepos)
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        showToast({ style: Toast.Style.Failure, title: msg });
      });
  }

  const createAction = (
    <Action.Push
      title="Create Repository"
      icon={Icon.Plus}
      target={<CreateRepoForm onCreated={revalidate} />}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter repositories...">
      {repos.length === 0 && !isLoading ? (
        <List.EmptyView
          title={error ?? "No repositories"}
          description={error ? undefined : "Press ⌘N to create one"}
          icon={error ? Icon.ExclamationMark : Icon.Box}
          actions={<ActionPanel>{createAction}</ActionPanel>}
        />
      ) : (
        repos.map((repo) => (
          <List.Item
            key={repo.id}
            icon={
              repo.avatar_url
                ? { source: repo.avatar_url, mask: Image.Mask.RoundedRectangle }
                : Icon.Code
            }
            title={repo.name}
            subtitle={repoSubtitle(repo)}
            accessories={[{ icon: repo.private ? Icon.Lock : Icon.Globe }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={repo.html_url}
                />
                <Action.CopyToClipboard
                  title="Copy SSH Clone URL"
                  content={sshCloneUrl(repo)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <ActionPanel.Section>{createAction}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
