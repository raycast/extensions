import { ActionPanel, Action, Detail, List, Icon } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { Bookmark } from "../types";
import { getFavicon } from "@raycast/utils";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export default function BookmarkItem(props: { bookmark: Bookmark }) {
  const bookmark = props.bookmark;

  const getDetails = () => {
    let md = `# ${bookmark.title}\n`;
    if (bookmark.cover) md += `![](${bookmark.cover})\n---\n`;
    md += `> ${bookmark.excerpt}\n\n`;

    if (bookmark.note) {
      md += `## Description\n${bookmark.note}\n\n`;
    }

    if (bookmark.highlights.length) {
      md += `## Highlights\n`;
      bookmark.highlights.map((hl) => {
        md += `> ${hl.text}${hl.note ? ` (Note: ${hl.note})` : ""}`;
      });
      md += "\n\n";
    }
    return md;
  };

  return (
    <List.Item
      id={String(bookmark._id)}
      icon={getFavicon(bookmark.link, { fallback: "raindrop-icon.png" })}
      key={bookmark._id}
      title={bookmark.title}
      subtitle={bookmark.tags.map((tag) => `#${tag}`).join(" ")}
      accessories={[{ text: dayjs().to(dayjs(bookmark.lastUpdate)) }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={bookmark.link} />
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={
              <Detail
                markdown={getDetails()}
                navigationTitle={bookmark.title}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={bookmark.link} />
                    <Action.CopyToClipboard title="Copy URL" content={bookmark.link} />
                    <Action.OpenInBrowser
                      title="Open Permanent Copy"
                      url={`https://api.raindrop.io/v1/raindrop/${bookmark._id}/cache`}
                    />
                  </ActionPanel>
                }
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label
                      title="Created"
                      text={dayjs(bookmark.created).format("ll")}
                    />
                    <Detail.Metadata.Label
                      title="Last Updated"
                      text={dayjs(bookmark.lastUpdate).format("ll")}
                    />
                    <Detail.Metadata.Label title="Domain" text={bookmark.domain} />

                    {bookmark.tags && (
                      <Detail.Metadata.TagList title="Tags">
                        {bookmark.tags.map((tag) => (
                          <Detail.Metadata.TagList.Item key={tag} text={tag} color={"#eed535"} />
                        ))}
                      </Detail.Metadata.TagList>
                    )}
                    <Detail.Metadata.Separator />
                    {bookmark.broken && <Detail.Metadata.Label title="Link broken" text={"Yes"} />}
                    {bookmark.important && <Detail.Metadata.Label title="Favorite" text={"Yes"} />}
                  </Detail.Metadata>
                }
              />
            }
          />
          <Action.CopyToClipboard title="Copy URL" content={bookmark.link} />
        </ActionPanel>
      }
    />
  );
}
