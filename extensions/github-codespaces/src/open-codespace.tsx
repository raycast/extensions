import { useState } from "react";
import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { personalAccessToken } from "./preferences";
import { Codespaces } from "./types";
import SortBy, { Criteria } from "./views/SortBy";
import CodespaceItem from "./views/CodespaceItem";
import {
  groupByCompute,
  groupByOwner,
  groupByRepository,
} from "./utils/groupBy";

export default function Command() {
  const { data, isLoading, revalidate } = useFetch<Codespaces>(
    "https://api.github.com/user/codespaces",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${personalAccessToken}`,
      },
    }
  );
  const [criteria, setCriteria] = useState<Criteria>("date");

  const handleRevalidate = revalidate;
  const handleSortByChange = setCriteria;

  if (!data?.codespaces) {
    return <List />;
  }

  const ListByCriteria = {
    date: () =>
      data?.codespaces
        .sort(
          (a, b) =>
            new Date(b.last_used_at).getTime() -
            new Date(a.last_used_at).getTime()
        )
        .map((codespace) => (
          <CodespaceItem
            key={codespace.id}
            codespace={codespace}
            onRevalidate={handleRevalidate}
          />
        )),
    repo: () => {
      const groupedCodespaces = groupByRepository(data.codespaces);
      return Object.keys(groupedCodespaces).map((group) => (
        <List.Section key={group} title={group}>
          {groupedCodespaces[group].map((codespace) => (
            <CodespaceItem
              key={codespace.id}
              codespace={codespace}
              onRevalidate={handleRevalidate}
            />
          ))}
        </List.Section>
      ));
    },
    owner: () => {
      const groupedCodespaces = groupByOwner(data.codespaces);
      return Object.keys(groupedCodespaces).map((group) => (
        <List.Section key={group} title={group}>
          {groupedCodespaces[group].map((codespace) => (
            <CodespaceItem
              key={codespace.id}
              codespace={codespace}
              onRevalidate={handleRevalidate}
            />
          ))}
        </List.Section>
      ));
    },
    compute: () => {
      const groupedCodespaces = groupByCompute(data.codespaces);
      return Object.keys(groupedCodespaces).map((group) => (
        <List.Section key={group} title={group}>
          {groupedCodespaces[group].map((codespace) => (
            <CodespaceItem
              key={codespace.id}
              codespace={codespace}
              onRevalidate={handleRevalidate}
            />
          ))}
        </List.Section>
      ));
    },
  };

  return (
    <List
      searchBarAccessory={<SortBy onSortByChange={handleSortByChange} />}
      isLoading={isLoading}
    >
      {ListByCriteria[criteria]()}
    </List>
  );
}
