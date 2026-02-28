import {
  Detail,
  ActionPanel,
  Action,
  AI,
  environment,
  Color,
  Cache,
  getPreferenceValues,
} from "@raycast/api";
import { useAI } from "@raycast/utils";
import { SecurityItem } from "./types";
import { stripHtml } from "./utils";
import { t, Language } from "./i18n";
import { useEffect, useState, useMemo, useRef } from "react";

const cache = new Cache();

export default function SummaryView({ item }: { item: SecurityItem }) {
  const preferences = useMemo(() => getPreferenceValues(), []);
  const lang = preferences.language as Language;
  const cleanContent = stripHtml(item.content);
  const canAccessAI = environment.canAccess(AI);
  const cacheKey = `summary_${item.link}`;

  // Use a ref to keep track of initial cache state to avoid killing the stream
  const hasInitialCache = useRef(!!cache.get(cacheKey));
  const [cachedData] = useState<string | undefined>(() => cache.get(cacheKey));

  const prompt = useMemo(
    () =>
      t(
        "summary_prompt",
        {
          title: item.title,
          source: item.source ?? "Unknown",
          content: cleanContent,
        },
        lang,
      ),
    [item.title, item.source, cleanContent, lang],
  );

  const { data, isLoading, error } = useAI(prompt, {
    execute: canAccessAI && !hasInitialCache.current,
  });

  useEffect(() => {
    // Only save to cache when loading is finished and data exists
    if (!isLoading && data && !hasInitialCache.current) {
      cache.set(cacheKey, data);
    }
  }, [isLoading, data, cacheKey]);

  const displayData = cachedData || data;
  const isActuallyLoading = isLoading && !displayData;

  if (error) {
    return (
      <Detail
        markdown={`# ${t("summary_error_title", undefined, lang)}\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title={t("summary_check_status", undefined, lang)}
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
        markdown={`# ${t("summary_pro_required", undefined, lang)}\n\n${t("summary_pro_desc", undefined, lang)}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title={t("summary_upgrade_btn", undefined, lang)}
              url="https://www.raycast.com/pro"
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `
# ${t("summary_title", undefined, lang)}
${!displayData && isLoading ? t("summary_loading", undefined, lang) : displayData || ""}

---
## ${t("summary_original", undefined, lang)}
${cleanContent}

[${t("summary_read_full", undefined, lang)}](${item.link})
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isActuallyLoading}
      navigationTitle={`${item.title} - ${t("summary_title", undefined, lang)}`}
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
            title={t("action_open_browser", undefined, lang)}
          />
          <Action.CopyToClipboard
            title={t("action_copy_summary", undefined, lang)}
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
