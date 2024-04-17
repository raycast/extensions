import { SearchResultDocument } from "../lib/types";
import { Color, Detail, Icon, List } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import { pie_svg } from "../lib/progress-icon";
import { compatIcons } from "../lib/compat";
import useJSRAPI from "../hooks/useJSRAPI";

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
      markdown={`## ${item.id}
${item.description}`}
      metadata={
        <Detail.Metadata>
          {data ? (
            <>
              <Detail.Metadata.Label
                title="Last Updated"
                text={formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })}
                icon={Icon.Clock}
              />
              <Detail.Metadata.Label title="Version" text={data.latestVersion} icon={Icon.ComputerChip} />
              <Detail.Metadata.Separator />
            </>
          ) : null}
          <Detail.Metadata.Label
            title="Score"
            text={item.score ? `${item.score.toString()}%` : "unknown"}
            icon={{ source: pie_svg(progress, iconColor), tintColor: iconColor }}
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
