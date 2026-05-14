import { Detail } from "@raycast/api";
import { useChangelog } from "../hooks/useChangelog";
import { StoreItem } from "../types";
import { ChangelogActions } from "./ChangelogActions";

interface ChangelogDetailProps {
  slug: string;
  title: string;
  items: StoreItem[];
  currentIndex: number;
}

export function ChangelogDetail({ slug, title, items, currentIndex }: ChangelogDetailProps) {
  const { data: changelog, isLoading } = useChangelog(slug);

  const markdown = changelog ?? `# ${title}\n\nNo changelog available for this extension.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${title} — Changelog`}
      actions={<ChangelogActions items={items} currentIndex={currentIndex} changelog={changelog} />}
    />
  );
}
