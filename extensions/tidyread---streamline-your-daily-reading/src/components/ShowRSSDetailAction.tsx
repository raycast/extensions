import { Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { parseRSS } from "../utils/biz";
import { RawFeed } from "../types";
import { uniqBy } from "lodash";
import { formatItemForDigest, formatRSSItems } from "../digest";
import { fetchMetadata } from "../utils/request";

function filterItems(feed: RawFeed) {
  return uniqBy(feed.items.slice(0, 10), "title").map((item) => ({
    ...item,
    feed: { ...feed, url: feed.link },
  }));
}

function RSSDetail(props: { rssLink: string; url?: string }) {
  const { rssLink, url } = props;
  const [rawFeed, setRawFeed] = useState<RawFeed>();
  const [favicon, setFavicon] = useState<string>();
  const [markdown, setMarkdown] = useState<string>("Fetching RSS Detail...");

  useEffect(() => {
    parseRSS(rssLink!)
      .then(async (res) => {
        const items = filterItems(res);
        const formatedItems = await formatRSSItems(items);
        let md = ``;
        for (const [index, item] of formatedItems.entries()) {
          md += formatItemForDigest(item, `${index + 1}. `, true);
        }

        setRawFeed(res);
        setMarkdown(md);

        fetchMetadata(res.link).then((metadata) => {
          setFavicon(metadata?.favicon);
        });
      })
      .catch((err) => {
        setMarkdown(`> **Failed to fetch**, error is: \`${err.message}\``);
      });
  }, []);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {favicon && <Detail.Metadata.Label title="Favicon" icon={favicon} />}
          {rawFeed?.title && <Detail.Metadata.Label title="Title" text={rawFeed.title} />}
          {rawFeed?.description && <Detail.Metadata.Label title="Description" text={rawFeed.description} />}
          {(url || rawFeed?.link) && (
            <Detail.Metadata.Link title="URL" text={url ?? rawFeed?.link ?? ""} target={url ?? rawFeed?.link ?? ""} />
          )}
          <Detail.Metadata.Link title="RSS Link" text={rssLink} target={rssLink} />

          {/* <Detail.Metadata.TagList title="Tags">
            {(item.tags || []).map((tag, index) => (
              <Detail.Metadata.TagList.Item key={index} text={tag} color={Color.Blue} />
            ))}
          </Detail.Metadata.TagList> */}
          {/* <Detail.Metadata.TagList title="Active Status">
            <Detail.Metadata.TagList.Item
              text={item?.activeStatus === "inactive" ? "Inactive" : "Active"}
              color={item?.activeStatus === "inactive" ? Color.Orange : Color.Green}
            />
          </Detail.Metadata.TagList> */}
        </Detail.Metadata>
      }
    />
  );
}

export default function ShowRSSDetailAction(props: { rssLink: string; url?: string }) {
  const { rssLink, url } = props;

  return (
    <Action.Push
      title="View RSS Detail"
      icon="rssicon.svg"
      target={<RSSDetail rssLink={rssLink} url={url} />}
      shortcut={{ modifiers: ["ctrl"], key: "r" }}
    />
  );
}
