import { useEffect, useState } from "react";
import { Detail, ActionPanel, Action, Icon, showToast, Toast, open, getPreferenceValues, Color } from "@raycast/api";
import { getSegmentDetails, Segment, getSegmentUsage, SegmentUsageSummary, getSegmentCount } from "./api";
import { formatDate } from "./utils/format-date";
import { isDataDrivenSegment } from "./utils/formatters";
import { getCustomerIoUrl } from "./utils/url-builder";

export default function SegmentDetail({ id }: { id: number }) {
  const [segment, setSegment] = useState<Segment | null>(null);
  const [usage, setUsage] = useState<SegmentUsageSummary | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [seg, use, cnt] = await Promise.all([getSegmentDetails(id), getSegmentUsage(id), getSegmentCount(id)]);
        setSegment(seg);
        setUsage(use);
        setCount(cnt);
      } catch (error) {
        showToast({
          title: "Error loading segment",
          message: error instanceof Error ? error.message : "Unknown error",
          style: Toast.Style.Failure,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!segment) {
    return <Detail markdown="Segment not found" />;
  }

  const preferences = getPreferenceValues<{ workspace_id?: string }>();
  const workspaceId = preferences.workspace_id || "";

  const markdown = `
# ${segment.name}

${segment.description || "_No description_"}

## Usage

### Campaigns (${usage ? usage.campaignCount : 0})
${
  usage && usage.campaigns.length > 0
    ? `
| Name | State |
|---|---|
${usage.campaigns.map((c) => `| [${c.name}](${getCustomerIoUrl(workspaceId, "campaign", c.id)}) | ${c.state || "Unknown"} |`).join("\n")}
`
    : "_Not used in any campaigns_"
}

### Newsletters (${usage ? usage.newsletterCount : 0})
${
  usage && usage.newsletters.length > 0
    ? `
| Name | State |
|---|---|
${usage.newsletters.map((n) => `| [${n.name}](${getCustomerIoUrl(workspaceId, "broadcast", n.id)}) | ${n.state || "Unknown"} |`).join("\n")}
`
    : "_Not used in any newsletters_"
}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text={isDataDrivenSegment(segment.type) ? "Data-driven" : "Manual"} />
          </Detail.Metadata.TagList>
          {/* Only show state tag if it is Draft */}
          {segment.state?.toLowerCase() === "draft" && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="Draft" color={Color.SecondaryText} />
            </Detail.Metadata.TagList>
          )}
          {count !== null && <Detail.Metadata.Label title="Member Count" text={count.toString()} />}
          <Detail.Metadata.Label title="Created" text={formatDate(segment.created_at)} />
          <Detail.Metadata.Label title="Updated" text={formatDate(segment.updated_at)} />
          {segment.tags && segment.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {segment.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Open in Customer.io"
            icon={Icon.Globe}
            onAction={() => {
              open(getCustomerIoUrl(workspaceId, "segment", segment.id));
            }}
          />
        </ActionPanel>
      }
    />
  );
}
