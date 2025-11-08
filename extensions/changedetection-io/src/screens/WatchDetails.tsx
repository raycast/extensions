import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { TagsResponse, WatchDetails as WatchDetailsType } from "@/types";
import { useApi } from "@/hooks/use-api";
import { useScreenshot } from "@/hooks/use-screenshot";
import WatchHistory from "@/screens/WatchHistory";

const WatchDetails = ({ id }: { id: string }) => {
  const { data: tags, isLoading: isLoadingTags } = useApi<TagsResponse>("tags");
  const { data, isLoading: isLoadingWatch } = useApi<WatchDetailsType>(`watch/${id}`);
  const { data: snapShot, isLoading: isLoadingSnapShot } = useApi<string>(`watch/${id}/history/latest`);
  const screenshot = useScreenshot(id);

  const markdown = !data
    ? ""
    : `${data.title ?? ""} \n\n ${data.url} \n\nSnapshot:\n${screenshot ? `\n![](${screenshot})\n\n` : "\n"} \`\`\`text\n${snapShot}\n\`\`\``;
  const tagLabels = (tags && data && data.tags.map((tag) => tags[tag])) ?? [];
  const isLoading = isLoadingWatch || isLoadingTags || isLoadingSnapShot;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            {tagLabels.length > 0 && (
              <Detail.Metadata.TagList title="Tags">
                {tagLabels.map((tag) => (
                  <Detail.Metadata.TagList.Item text={tag.title} key={tag.uuid} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Label title="Check Count" text={data.check_count.toString()} />
            <Detail.Metadata.Label title="Date Created" text={new Date(data.date_created * 1000).toString()} />
            <Detail.Metadata.Label
              title="Last Viewed"
              text={data.last_viewed ? new Date(data.last_viewed * 1000).toString() : "N/A"}
            />
            <Detail.Metadata.Label title="Method" text={data.method} />
            <Detail.Metadata.Label title="Notification Alert Count" text={data.notification_alert_count.toString()} />
            <Detail.Metadata.Label title="Paused" icon={data.paused ? Icon.Check : Icon.Xmark} />
            <Detail.Metadata.Label
              title="Processor"
              text={
                data.processor === "restock_diff"
                  ? "Re-stock & Price detection for single product pages"
                  : "Webpage Text/HTML, JSON and PDF changes"
              }
            />
            <Detail.Metadata.Label
              title="Sort Text Alphabetically"
              icon={data.sort_text_alphabetically ? Icon.Check : Icon.Xmark}
            />
          </Detail.Metadata>
        ) : null
      }
      actions={
        data ? (
          <ActionPanel>
            <Action.Push icon={Icon.List} title="View History" target={<WatchHistory id={id} />} />
          </ActionPanel>
        ) : null
      }
    />
  );
};

export default WatchDetails;
