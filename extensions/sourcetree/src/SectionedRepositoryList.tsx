import { List } from "@raycast/api";
import { Repository } from "./lib/repository";
import { RepositoryItem } from "./RepositoryItem";

interface SectionedRepositoryListProps {
  repositories?: Repository[];
}

export function SectionedRepositoryList({ repositories }: SectionedRepositoryListProps) {
  if (!repositories) {
    return <></>;
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
