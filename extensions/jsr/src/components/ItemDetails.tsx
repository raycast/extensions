import { formatDistanceToNow } from "date-fns";

import type { Color } from "@raycast/api";
import { Detail, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

import type { SearchResultDocument } from "@/types";

import { compatIcons } from "@/lib/compat";

import useJSRAPI from "@/hooks/useJSRAPI";

const ItemDetails = ({
  item,
  progress,
  iconColor,
}: {
  item: SearchResultDocument;
  progress: number;
  iconColor: Color;
}) => {
  const icons = compatIcons(item);
  const { data, isLoading } = useJSRAPI(item);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={[
        `## ${item.id}`,
        item.description,
        "",
        !isLoading && data?.latestVersion ? `![](https://jsr.io/badges/${item.id})` : "",
        !isLoading && item.score ? `![](https://jsr.io/badges/${item.id}/score)` : "",
      ].join("\n")}
      metadata={
        <Detail.Metadata>
          {data ? (
            <>
              <Detail.Metadata.Label
                title="Last Updated"
                text={data.updatedAt ? formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true }) : "unknown"}
                icon={Icon.Clock}
              />
              <Detail.Metadata.Label title="Version" text={data.latestVersion ?? "unknown"} icon={Icon.ComputerChip} />
              <Detail.Metadata.Separator />
            </>
          ) : null}
          <Detail.Metadata.Label
            title="Score"
            text={item.score ? `${item.score.toString()}%` : "unknown"}
            icon={{
              source: getProgressIcon(progress / 100, iconColor, { backgroundOpacity: 0 }),
            }}
          />
          <Detail.Metadata.TagList title="Compatibility">
            {icons.map((ico) => (
              <Detail.Metadata.TagList.Item key={ico.text} text={ico.text} icon={ico.icon} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="JSR" text="View on jsr.io" target={`https://jsr.io/${item.id}`} />
          {data?.githubRepository?.owner && data?.githubRepository?.name ? (
            <Detail.Metadata.Link
              title="GitHub"
              text="View on GitHub"
              target={`https://github.com/${data.githubRepository.owner}/${data.githubRepository.name}`}
            />
          ) : null}
        </Detail.Metadata>
      }
    />
  );
};

export default ItemDetails;
