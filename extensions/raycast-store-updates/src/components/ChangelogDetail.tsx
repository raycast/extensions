import { Detail } from "@raycast/api";
import { useChangelog } from "../hooks/useChangelog";

export function ChangelogDetail({ slug, title }: { slug: string; title: string }) {
  const { data: changelog, isLoading } = useChangelog(slug);

  const markdown = changelog ?? `# ${title}\n\nNo changelog available for this extension.`;

  return <Detail isLoading={isLoading} markdown={markdown} navigationTitle={`${title} — Changelog`} />;
}
