import { Color, Icon, List } from "@raycast/api";
import dayjs from "dayjs";

import type { Repository } from "../../types/api";
import { getLanguageColor } from "../../utils/languages";

export default function RepositoryDetails({ repo }: { repo: Repository }) {
  const ownerName = repo.owner?.login || "Unknown";
  const languageColor = getLanguageColor(repo.language ?? "");
  const created = safeFormatDate(repo.created_at);
  const updated = safeFormatDate(repo.updated_at);
  const description = repo.description || "No description provided.";
  const size = formatSize(repo.size);
  const hasStatusFlags = repo.private || repo.archived || repo.fork;
  const hasTopics = repo.topics && repo.topics.length > 0;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={repo.full_name ?? ""} />
          <List.Item.Detail.Metadata.Label title="Description" text={description} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Owner" text={ownerName} icon={repo.owner?.avatar_url} />

          {repo.language && (
            <List.Item.Detail.Metadata.TagList title="Language">
              <List.Item.Detail.Metadata.TagList.Item text={repo.language} color={languageColor} />
            </List.Item.Detail.Metadata.TagList>
          )}

          <List.Item.Detail.Metadata.Label title="Stars" icon={Icon.Star} text={`${repo.stars_count ?? 0}`} />
          <List.Item.Detail.Metadata.Label title="Forks" text={`${repo.forks_count ?? 0}`} />
          <List.Item.Detail.Metadata.Label title="Issues" icon={Icon.Circle} text={`${repo.open_issues_count ?? 0}`} />
          <List.Item.Detail.Metadata.Label title="Watchers" icon={Icon.Eye} text={`${repo.watchers_count ?? 0}`} />
          <List.Item.Detail.Metadata.Label title="Size" text={size} />

          {hasStatusFlags && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Status">
                {repo.private && <List.Item.Detail.Metadata.TagList.Item text="Private" color={Color.Red} />}
                {repo.archived && <List.Item.Detail.Metadata.TagList.Item text="Archived" color={Color.Orange} />}
                {repo.fork && <List.Item.Detail.Metadata.TagList.Item text="Fork" color={Color.Blue} />}
              </List.Item.Detail.Metadata.TagList>
            </>
          )}

          {hasTopics && (
            <List.Item.Detail.Metadata.TagList title="Topics">
              {repo.topics!.map((topic) => (
                <List.Item.Detail.Metadata.TagList.Item key={topic} text={topic} color={Color.SecondaryText} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}

          {repo.website && <List.Item.Detail.Metadata.Link title="Website" target={repo.website} text={repo.website} />}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Created" icon={Icon.Calendar} text={created} />
          <List.Item.Detail.Metadata.Label title="Updated" icon={Icon.Calendar} text={updated} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function safeFormatDate(input?: string): string {
  if (!input) return "-";
  const d = dayjs(input);
  return d.isValid() ? d.format("DD.MM.YYYY") : "-";
}

function formatSize(kibibytes?: number): string {
  if (kibibytes === undefined || kibibytes === null) return "-";
  if (kibibytes < 1024) return `${kibibytes} KiB`;
  const mebibytes = (kibibytes / 1024).toFixed(1);
  return `${mebibytes} MiB`;
}
