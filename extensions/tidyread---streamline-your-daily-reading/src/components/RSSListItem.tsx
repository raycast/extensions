import { Action, Color, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { RawFeed, SourceWithStatus } from "../types";
import { extractDomain, filterByShownStatus, silent } from "../utils/util";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { parseRSS } from "../utils/biz";
import { uniqBy } from "lodash";
import { formatItemForDigest, formatRSSItems } from "../digest";
import CustomActionPanel from "./CustomActionPanel";
import { addSource } from "../store";
import { showFailureToast } from "@raycast/utils";

function filterItems(feed: RawFeed) {
  return uniqBy(feed.items.slice(0, 10), "title").map((item) => ({
    ...item,
    feed: { ...feed, url: feed.link },
  }));
}

export default function RSSListItem(props: {
  item: Partial<SourceWithStatus>;
  selected: boolean;
  actions?: ReactNode | null;
}) {
  const { item, selected, actions = null } = props;
  const [markdown, setMarkdown] = useState<string>("Fetching RSS data...");

  useEffect(() => {
    if (selected) {
      parseRSS(item.rssLink!)
        .then(async (res) => {
          const items = filterItems(res);
          const formatedItems = await formatRSSItems(items);
          let md = ``;
          for (const [index, item] of formatedItems.entries()) {
            md += formatItemForDigest(item, `${index + 1}. `, true);
          }

          setMarkdown(md);
        })
        .catch((err) => {
          setMarkdown(`> **Failed to fetch**, error is: \`${err.message}\``);
        });
    } else {
      setMarkdown("Fetching RSS data...");
    }
  }, [selected]);

  const keywords = useMemo(() => {
    return [silent(() => extractDomain(item.url!))].filter(Boolean) as string[];
  }, [item]);

  return (
    <List.Item
      id={item.url}
      key={item.url}
      title={item.title!}
      keywords={keywords}
      actions={
        <CustomActionPanel>
          <Action
            title="Add This"
            icon={Icon.Plus}
            onAction={async () => {
              showToast(Toast.Style.Animated, "Adding Source...");

              try {
                await addSource({
                  title: item.title!,
                  url: item.url!,
                  rssLink: item.rssLink!,
                  favicon: item.favicon,
                  tags: item.tags,
                  timeSpan: "1",
                  schedule: "everyday",
                  customDays: [],
                });
                showToast(Toast.Style.Success, "Source Added");
                await launchCommand({ name: "manage-source-list.command", type: LaunchType.UserInitiated });
              } catch (err: any) {
                showFailureToast("Failed To Add Source", err.message);
              }
            }}
          ></Action>
          {actions}
        </CustomActionPanel>
      }
      accessories={filterByShownStatus([
        {
          tag: {
            value: `${(item.tags || [])?.join?.(", ")}`,
            color: Color.Blue,
          },
          show: (item.tags || [])?.length > 0,
        },
      ])}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="URL" text={item.url} />
              <List.Item.Detail.Metadata.Label title="RSS Link" text={item.rssLink!} />
              {item.favicon && <List.Item.Detail.Metadata.Label title="Favicon" icon={item.favicon} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
