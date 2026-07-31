import { Cache, Form } from "@raycast/api";
import { useState, useEffect } from "react";
import { Repository, useSearchRepositories } from "../hooks/useRepositorySearch";

const PREVIOUS_REPOSITORIES_CACHE_KEY = "previousRepositories";
const MAX_PREVIOUS_REPOSITORIES = 15;
const cache = new Cache();

function readCachedRepositories(): Repository[] {
  const raw = cache.get(PREVIOUS_REPOSITORIES_CACHE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function writeCachedRepositories(repos: Repository[]) {
  cache.set(PREVIOUS_REPOSITORIES_CACHE_KEY, JSON.stringify(repos.slice(0, MAX_PREVIOUS_REPOSITORIES)));
}

/**
 * Cache a repository as "recently used". Call this on successful form
 * submission rather than on dropdown selection to avoid caching auto-selected repos.
 */
export function cacheRepository(nameWithOwner: string) {
  const previous = readCachedRepositories();

  const existing = previous.find((r) => r.nameWithOwner === nameWithOwner);

  let updated: Repository[];
  if (existing) {
    updated = [existing, ...previous.filter((r) => r.nameWithOwner !== nameWithOwner)];
  } else {
    const [owner, name] = nameWithOwner.split("/");
    const newRepo: Repository = {
      id: nameWithOwner,
      name,
      nameWithOwner,
      owner: { login: owner, avatarUrl: "" },
    };
    updated = [newRepo, ...previous];
  }

  writeCachedRepositories(updated);
}

export function RepositoryDropdown(
  props: Readonly<{
    itemProps: Form.ItemProps<string>;
    organizations?: string[];
    onLoadingChange?: (isLoading: boolean) => void;
  }>,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [previousRepositories] = useState<Repository[]>(readCachedRepositories);
  const { data, isLoading } = useSearchRepositories({
    searchQuery,
    organizations: props.organizations,
  });

  const { onChange, value, ...restItemProps } = props.itemProps;

  // Auto-select the first previously used repository if no value is set
  useEffect(() => {
    if (!value && previousRepositories.length > 0 && onChange) {
      onChange(previousRepositories[0].nameWithOwner);
    }
  }, [value, previousRepositories, onChange]);

  // Notify parent about loading state changes
  useEffect(() => {
    props.onLoadingChange?.(isLoading);
  }, [isLoading, props.onLoadingChange]);

  return (
    <Form.Dropdown
      title="Repository"
      placeholder="Select a repository"
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      onChange={(value) => {
        onChange?.(value);
      }}
      value={value}
      {...restItemProps}
      throttle
    >
      <Form.Dropdown.Section title="Recently Used">
        {(searchQuery
          ? previousRepositories.filter((repository) =>
              repository.nameWithOwner.toLowerCase().includes(searchQuery.toLowerCase()),
            )
          : previousRepositories
        ).map((repository) => (
          <Form.Dropdown.Item
            key={`${repository.id}-recent`}
            value={repository.nameWithOwner}
            title={repository.nameWithOwner}
          />
        ))}
      </Form.Dropdown.Section>
      <Form.Dropdown.Section title="All">
        {data?.nodes
          ?.filter(
            (repository) =>
              !previousRepositories.some((prevRepo) => prevRepo.nameWithOwner === repository.nameWithOwner),
          )
          .map((repository) => (
            <Form.Dropdown.Item key={repository.id} value={repository.nameWithOwner} title={repository.nameWithOwner} />
          ))}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}
