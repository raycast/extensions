import { Detail, Icon } from "@raycast/api";
import { MemeDetails } from "knowyourmeme-js";

export function MemeDetailMetadata({ meme }: { meme: MemeDetails }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label icon={Icon.Eye} title="Views" text={meme.views?.toLocaleString() || "No Data"} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label icon={Icon.Box} title="Type" text={meme.type.join(", ") || "No Data"} />
      <Detail.Metadata.Label icon={Icon.Calendar} title="Year" text={meme.year || "No Data"} />
      <Detail.Metadata.Label icon={Icon.Compass} title="Origin" text={meme.origin || "No Data"} />
      <Detail.Metadata.Label icon={Icon.Pin} title="Region" text={meme.region || "No Data"} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="Search Interest" target={meme.googleTrends} text="Google Trends" />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Tags">
        {meme.tags?.map((tag) => (
          <Detail.Metadata.TagList.Item key={tag} text={tag} />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}
