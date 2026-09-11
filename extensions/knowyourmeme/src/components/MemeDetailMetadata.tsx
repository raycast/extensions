import { Detail, Icon, open } from "@raycast/api";
import { MemeDetails } from "knowyourmeme-js";

export function MemeDetailMetadata({ meme }: { meme: MemeDetails }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label icon={Icon.Eye} title="Views" text={meme.views?.toLocaleString() || "No Data"} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Type">
        {meme.type?.map((typeEntry) => (
          <Detail.Metadata.TagList.Item key={typeEntry} text={typeEntry} />
        ))}
      </Detail.Metadata.TagList>
      {meme.year && <Detail.Metadata.Label icon={Icon.Calendar} title="Year" text={meme.year || "No Data"} />}
      {meme.origin && <Detail.Metadata.Label icon={Icon.Compass} title="Origin" text={meme.origin || "No Data"} />}
      {meme.region && <Detail.Metadata.Label icon={Icon.Pin} title="Region" text={meme.region || "No Data"} />}
      <Detail.Metadata.Separator />
      {meme.googleTrendsUrl && (
        <>
          <Detail.Metadata.Link title="Search Interest" target={meme.googleTrendsUrl} text="Google Trends" />
          <Detail.Metadata.Separator />
        </>
      )}
      {meme.imgflipUrl && (
        <>
          <Detail.Metadata.Link title="Meme Generator" target={meme.imgflipUrl} text="Imgflip" />
          <Detail.Metadata.Separator />
        </>
      )}
      <Detail.Metadata.TagList title="Tags">
        {meme.tags?.map((tag) => (
          <Detail.Metadata.TagList.Item
            key={tag}
            text={tag}
            onAction={() => open(`https://knowyourmeme.com/search?q=${encodeURIComponent(`tags:("${tag}")`)}`)}
          />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}
