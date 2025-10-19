import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Bookmark } from "../types";

interface ExistingBookmarkDetailProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
}

export function ExistingBookmarkDetail(props: ExistingBookmarkDetailProps) {
  const { bookmark, onEdit } = props;
  const createdDate = new Date(bookmark.created);
  const lastUpdatedDate = new Date(bookmark.lastUpdate);

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
        md += `> ${hl.text}${hl.note ? ` (Note: ${hl.note})` : ""}\n\n`;
      });
      md += "\n\n";
    }
    return md;
  };

  return (
    <Detail
      markdown={getDetails()}
      navigationTitle={bookmark.title}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={bookmark.link} />
          <Action.CopyToClipboard title="Copy URL" content={bookmark.link} />
          <Action
            title="Edit Bookmark"
            icon={Icon.Pencil}
            onAction={() => onEdit(bookmark)}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Created" text={createdDate.toLocaleDateString()} />
          <Detail.Metadata.Label title="Last Updated" text={lastUpdatedDate.toLocaleDateString()} />
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
  );
}
