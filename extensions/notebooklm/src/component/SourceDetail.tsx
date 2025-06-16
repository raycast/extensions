import { useState, useEffect } from "react";
import { SummaryService } from "../services";
import { Source, SourceStatus, SourceType } from "../types";
import { formatMarkdown } from "../utils/transformData";
import { Color, List } from "@raycast/api";

export function SourceDetail({ summaryService, source }: { summaryService: SummaryService; source: Source }) {
  const metadata = source.metadata;
  const link = metadata.site_url?.[0] || metadata.youtube_info?.url || "";
  const added_time = metadata.complete_info?.complete_time || "N/A";
  const [summary, setSummary] = useState(() => summaryService.summarys[source.id]?.content || "");
  const [isLoading, setLoading] = useState(!summary && source.status === SourceStatus.Success);

  useEffect(() => {
    const unsubLoading = summaryService.subscribe("loading", (data) => {
      if (data && "scope" in data && data.scope === "detail" && data.sourceId === source.id) {
        setLoading(data.status);
      }
    });

    const unsubSummary = summaryService.subscribe("summaryUpdated", (data) => {
      if (data && "sourceId" in data && data.sourceId === source.id && "content" in data) {
        setSummary(data.content);
      }
    });

    return () => {
      unsubLoading();
      unsubSummary();
    };
  }, [source.id]);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={
        source.status === SourceStatus.Success
          ? formatMarkdown(source.title, summary)
          : "## " + SourceStatus[source.status]
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="">
            {source.status === SourceStatus.Upload_Prevented && (
              <List.Item.Detail.Metadata.TagList.Item text="Prevented" color={Color.Red} />
            )}
            <List.Item.Detail.Metadata.TagList.Item
              text={SourceType[metadata.source_type]}
              color={metadata.icon?.tintColor}
            />
            {metadata.youtube_info?.channelName && (
              <List.Item.Detail.Metadata.TagList.Item text={metadata.youtube_info?.channelName} color={Color.Orange} />
            )}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Word Count">
            <List.Item.Detail.Metadata.TagList.Item text={`${metadata.word_count || "N/A"} words`} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Added">
            <List.Item.Detail.Metadata.TagList.Item text={`${added_time}`} />
          </List.Item.Detail.Metadata.TagList>
          {link && <List.Item.Detail.Metadata.Link title="Link" target={link} text={"Original Source"} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
