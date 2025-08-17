import React, { useEffect, useState } from "react";
import { ActionPanel, Color, List, showToast, Action, Image, Toast, Icon } from "@raycast/api";
import useSWR, { SWRConfig } from "swr";
import { Schema } from "bitbucket";

import { getRepositoriesLazy } from "../../queries";
import { Repository } from "./interface";
import { icon } from "../../helpers/icon";
import { cacheConfig } from "../../helpers/cache";
import { ShowPipelinesActions, ShowPullRequestsActions } from "./actions";
import { getFavoriteRepositories, toggleFavoriteRepository } from "../../helpers/favorites";

export function SearchRepositories() {
  return (
    <SWRConfig value={cacheConfig}>
      <SearchListLazy />
    </SWRConfig>
  );
}

const SearchListLazy: React.FC = () => {
  const [query, setQuery] = useState("");
  const [favoriteRepos, setFavoriteRepos] = useState<string[]>([]);
  const { data, error, isLoading, isValidating } = useSWR<Schema.Repository[]>(
    `/repositories?query=${query}`,
    getRepositoriesLazy,
  );

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favorites = await getFavoriteRepositories();
        setFavoriteRepos(favorites.map((repo) => repo.uuid));
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load favorites",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };
    loadFavorites();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading repositories",
        message: error.message,
      });
    }
  }, [error]);

  const sortedData = data
    ? [...data].sort((a, b) => {
        const aIsFavorite = favoriteRepos.includes(a.uuid as string);
        const bIsFavorite = favoriteRepos.includes(b.uuid as string);

        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return 0;
      })
    : [];

  const handleToggleFavorite = async (repo: Repository) => {
    const newIsFavorite = await toggleFavoriteRepository(repo);

    if (newIsFavorite) {
      setFavoriteRepos((prev) => [...prev, repo.uuid]);
      showToast({
        style: Toast.Style.Success,
        title: "Added to favorites",
        message: `${repo.name} has been added to favorites`,
      });
    } else {
      setFavoriteRepos((prev) => prev.filter((id) => id !== repo.uuid));
      showToast({
        style: Toast.Style.Success,
        title: "Removed from favorites",
        message: `${repo.name} has been removed from favorites`,
      });
    }
  };

  return (
    <List
      isLoading={isLoading || isValidating}
      searchBarPlaceholder="Search by name..."
      onSearchTextChange={setQuery}
      throttle
    >
      <List.Section title="Repositories" subtitle={sortedData.length.toString()}>
        {sortedData.map((repoData) => {
          const repo = toRepository(repoData);
          const isFavorite = favoriteRepos.includes(repo.uuid);
          return (
            <SearchListItem
              key={repo.uuid}
              repo={repo}
              isFavorite={isFavorite}
              onToggleFavorite={() => handleToggleFavorite(repo)}
            />
          );
        })}
      </List.Section>
    </List>
  );
};

function toRepository(repo: Schema.Repository): Repository {
  return {
    name: repo.name as string,
    uuid: repo.uuid as string,
    slug: repo.slug as string,
    fullName: repo.full_name as string,
    avatarUrl: repo.links?.avatar?.href as string,
    description: (repo.description as string) || "",
    url: `https://bitbucket.org/${repo.full_name}`,
    clone: {
      ssh: repo.links?.clone?.find((l) => l.name === "ssh")?.href,
      https: repo.links?.clone?.find((l) => l.name === "https")?.href,
    },
  };
}

interface SearchListItemProps {
  repo: Repository;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function SearchListItem({ repo, isFavorite, onToggleFavorite }: SearchListItemProps) {
  return (
    <List.Item
      title={repo.name}
      subtitle={repo.description}
      icon={{ source: repo.avatarUrl, mask: Image.Mask.RoundedRectangle }}
      accessories={isFavorite ? [{ tag: { value: "Favorite", color: Color.Yellow }, icon: Icon.Star }] : []}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browser actions">
            <Action.OpenInBrowser
              title="Open Repository in Browser"
              url={repo.url}
              icon={{ source: icon.code, tintColor: Color.PrimaryText }}
            />
            <Action.OpenInBrowser
              title="Open Branches in Browser"
              url={repo.url + "/branches"}
              icon={{ source: icon.branch, tintColor: Color.PrimaryText }}
            />
            <Action.OpenInBrowser
              title="Open Pull Requests in Browser"
              url={repo.url + "/pull-requests"}
              icon={{ source: icon.pr, tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.OpenInBrowser
              title="Open Pipelines in Browser"
              url={repo.url + "/addon/pipelines/home"}
              icon={{
                source: icon.pipeline.self,
                tintColor: Color.PrimaryText,
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Repository Actions">
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? { source: Icon.Star } : Icon.Star}
              onAction={onToggleFavorite}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy Links">
            <Action.CopyToClipboard title={"Copy Repository link"} content={repo.url} icon={Icon.CopyClipboard} />
            {repo.clone.ssh ? (
              <Action.CopyToClipboard
                title={"Copy Git Clone Command (SSH)"}
                content={`git clone ${repo.clone.ssh}`}
                icon={Icon.CopyClipboard}
              />
            ) : null}
            {repo.clone.https ? (
              <Action.CopyToClipboard
                title={"Copy Git Clone Command (HTTPS)"}
                content={`git clone ${repo.clone.https}`}
                icon={Icon.CopyClipboard}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Details">
            <ShowPipelinesActions repo={repo} />
            <ShowPullRequestsActions repo={repo} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
