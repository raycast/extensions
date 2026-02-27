import {
  Detail,
  ActionPanel,
  Action,
  AI,
  environment,
  Color,
  Cache,
} from "@raycast/api";
import { useAI } from "@raycast/utils";
import { SecurityItem } from "./types";
import { stripHtml } from "./utils";
import { t } from "./i18n";
import { useEffect, useState } from "react";

const cache = new Cache();

export default function SummaryView({ item }: { item: SecurityItem }) {
  const cleanContent = stripHtml(item.content);
  const canAccessAI = environment.canAccess(AI);
  const cacheKey = `summary_${item.link}`;

  const [cachedData, setCachedData] = useState<string | undefined>(() =>
    cache.get(cacheKey),
  );

  const prompt = t("summary_prompt", {
    title: item.title,
    source: item.source ?? "Unknown",
    content: cleanContent,
  });

  const { data, isLoading, error } = useAI(prompt, {
    execute: canAccessAI && !cachedData,
  });

  useEffect(() => {
    if (data && !cachedData) {
      cache.set(cacheKey, data);
      setCachedData(data);
    }
  }, [data, cacheKey, cachedData]);

  const displayData = cachedData || data;
  const isActuallyLoading = isLoading && !cachedData;

  if (error) {
    return (
      <Detail
        markdown={`# ${t("summary_error_title")}\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title={t("summary_check_status")}
              url="https://status.raycast.com"
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!canAccessAI) {
    return (
      <Detail
        markdown={`# ${t("summary_pro_required")}\n\n${t("summary_pro_desc")}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title={t("summary_upgrade_btn")}
              url="https://www.raycast.com/pro"
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `
# ${t("summary_title")}
${isActuallyLoading ? t("summary_loading") : displayData}

---
## ${t("summary_original")}
${cleanContent}

[${t("summary_read_full")}](${item.link})
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isActuallyLoading}
      navigationTitle={`${item.title} - ${t("summary_title")}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Source" text={item.source} />
          <Detail.Metadata.Label
            title="Date"
            text={item.pubDate.toLocaleDateString()}
          />
          <Detail.Metadata.TagList title="Category">
            <Detail.Metadata.TagList.Item
              text={item.category}
              color={getCategoryColor(item.category)}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={item.link}
            title={t("action_open_browser")}
          />
          <Action.CopyToClipboard
            title="Copy Summary"
            content={displayData || ""}
          />
        </ActionPanel>
      }
    />
  );
}

function getCategoryColor(category: string) {
  switch (category) {
    case "vulnerability":
      return Color.Red;
    case "intelligence":
      return Color.Orange;
    case "news":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}
