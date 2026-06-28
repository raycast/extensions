import { List } from "@raycast/api";
import { Repository } from "./lib/repository";
import { RepositoryItem } from "./RepositoryItem";
import { JSX } from "react";

interface SectionedRepositoryListProps {
  repositories?: Repository[];
}

export function SectionedRepositoryList({ repositories }: SectionedRepositoryListProps): JSX.Element {
  if (!repositories?.length) {
    return (
      <List.EmptyView
        title="Connect a hosted account"
        description="Sourcetree connects to many popular Git or Mercurial services allowing you to clone your projects quickly and keep everything in sync."
      />
    );
  }

  const sections = repositories.reduce((m, r) => {
    const section = r.tree.length ? r.tree[0] : "Ungrouped";

    return m.set(section, [...(m.get(section) || []), r]);
  }, new Map());

  return (
    <>
      {[...sections.keys()].map((section) => (
        <List.Section key={section} title={section}>
          {sections.get(section).map((repo: Repository) => (
            <RepositoryItem key={repo.hashValue} repo={repo} />
          ))}
        </List.Section>
      ))}
    </>
  );
}
