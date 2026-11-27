// Your repositories, and any public repository on GitHub as you type: the way to a repository's looks.
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { gh, parseRepository } from "../lib/github";
import { useMyRepositories, type MyRepository } from "../lib/hooks";
import { LookGrid } from "./card-views";

interface Found {
  full_name: string;
  description: string | null;
  stargazers_count: number;
}

/** Your repositories, and any public one on GitHub as you type. */
export function RepositoryList({ initial, pushed = false }: { initial: string; pushed?: boolean }) {
  const [text, setText] = useState(initial);
  const query = text.trim();
  const { data: mine, isLoading: loadingMine, error: mineError, revalidate: reloadMine } = useMyRepositories();
  const {
    data: found,
    isLoading: searching,
    error: searchError,
    revalidate: search,
  } = useCachedPromise(
    async (q: string) =>
      q.length < 2
        ? []
        : (await gh().rest<{ items: Found[] }>(`/search/repositories?q=${encodeURIComponent(q)}&per_page=20`)).data
            .items,
    [query],
    { keepPreviousData: true, initialData: [] as Found[] },
  );
  const lower = query.toLowerCase();
  const shownMine = mine.filter(
    (r) => !lower || `${r.nameWithOwner} ${r.description ?? ""}`.toLowerCase().includes(lower),
  );
  const mineNames = new Set(mine.map((r) => r.nameWithOwner.toLowerCase()));
  const direct = parseRepository(query);
  const others = found.filter(
    (r) => !mineNames.has(r.full_name.toLowerCase()) && r.full_name.toLowerCase() !== direct?.toLowerCase(),
  );

  return (
    <List
      navigationTitle={pushed ? "Add a Repository Card" : undefined}
      isLoading={loadingMine || searching}
      filtering={false}
      searchText={text}
      onSearchTextChange={setText}
      throttle
      searchBarPlaceholder="Your repositories, or search GitHub (owner/name opens one)"
    >
      {(mineError || searchError) && !shownMine.length && !others.length && !direct ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not read GitHub"
          description={(mineError ?? searchError)?.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  if (mineError) reloadMine();
                  if (searchError) search();
                }}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {direct && !mineNames.has(direct.toLowerCase()) ? (
        <List.Section title="Open">
          <Item full={direct} description="Any public repository, by owner/name" />
        </List.Section>
      ) : null}
      <List.Section title="Your Repositories">
        {shownMine.map((r: MyRepository) => (
          <Item key={r.nameWithOwner} full={r.nameWithOwner} description={r.description} stars={r.stargazerCount} />
        ))}
      </List.Section>
      <List.Section title="On GitHub">
        {others.map((r) => (
          <Item key={r.full_name} full={r.full_name} description={r.description} stars={r.stargazers_count} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ full, description, stars }: { full: string; description: string | null; stars?: number }) {
  return (
    <List.Item
      title={full}
      subtitle={description ?? undefined}
      icon={Icon.Book}
      accessories={stars === undefined ? [] : [{ icon: Icon.Star, text: String(stars) }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Looks"
            icon={Icon.AppWindowGrid3x3}
            target={<LookGrid target={{ kind: "repo", full }} pushed />}
          />
          <Action.OpenInBrowser title="Open on GitHub" url={`https://github.com/${full}`} />
        </ActionPanel>
      }
    />
  );
}
