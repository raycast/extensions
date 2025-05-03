import { Action, Color, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { RawFeed, ExternalSource } from "../types";
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
  item: Partial<ExternalSource>;
  selected: boolean;
  actions?: ReactNode | null;
}) {
  const { item, selected, actions = null } = props;
  const [markdown, setMarkdown] = useState<string>("Fetching RSS Detail...");

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
      setMarkdown("Fetching RSS Detail...");
    }
  }, [selected]);

  const keywords = useMemo(() => {
    return [item.description, item.url, new URL(item.url!).hostname, silent(() => extractDomain(item.url!))].filter(
      Boolean,
    ) as string[];
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
          icon: "inactive.svg",
          tooltip: "This source is inactive",
          show: item.activeStatus === "inactive",
        },
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
              {item.favicon && <List.Item.Detail.Metadata.Label title="Favicon" icon={item.favicon} />}
              <List.Item.Detail.Metadata.Label title="Title" text={item.title} />
              {item.description && <List.Item.Detail.Metadata.Label title="Description" text={item.description} />}
              <List.Item.Detail.Metadata.Link title="URL" text={item.url!} target={item.url!} />
              <List.Item.Detail.Metadata.Link title="RSS Link" text={item.rssLink!} target={item.rssLink!} />
              <List.Item.Detail.Metadata.TagList title="Tags">
                {(item.tags || []).map((tag, index) => (
                  <List.Item.Detail.Metadata.TagList.Item key={index} text={tag} color={Color.Blue} />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Active Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={item?.activeStatus === "inactive" ? "Inactive" : "Active"}
                  color={item?.activeStatus === "inactive" ? Color.Orange : Color.Green}
                />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
