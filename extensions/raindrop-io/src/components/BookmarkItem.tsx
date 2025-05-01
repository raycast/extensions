import {
  ActionPanel,
  Action,
  Detail,
  List,
  Icon,
  getPreferenceValues,
  Toast,
  showToast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { Bookmark } from "../types";
import { getFavicon } from "@raycast/utils";
import fetch from "node-fetch";
import { BookmarkForm } from "./BookmarkForm";

function ActionEditBookmark(props: { bookmark: Bookmark; revalidate: () => void }) {
  const { bookmark, revalidate } = props;

  return (
    <Action.Push
      title="Edit Bookmark"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      icon={Icon.Pencil}
      target={
        <BookmarkForm
          mode="edit"
          bookmarkId={bookmark._id}
          defaultValues={{
            link: bookmark.link,
            title: bookmark.title,
            collection: bookmark.collection?.$id?.toString() ?? "-1",
            tags: bookmark.tags,
          }}
          onWillSave={() => {
            showToast(Toast.Style.Animated, "Updating Bookmark...");
          }}
          onSaved={() => {
            showToast(Toast.Style.Success, "Bookmark Updated");
            revalidate();
          }}
          onError={() => {
            showToast(Toast.Style.Failure, "Error Updating Bookmark");
          }}
        />
      }
    />
  );
}

export default function BookmarkItem(props: { bookmark: Bookmark; revalidate: () => void }) {
  const { bookmark, revalidate } = props;

  const preferences = getPreferenceValues();

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

  async function handleDelete() {
    const options: Alert.Options = {
      title: "Delete bookmark",
      message: "Are you sure you want to delete this bookmark?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          const toast = await showToast(Toast.Style.Animated, "Deleting Link");
          try {
            await fetch(`https://api.raindrop.io/rest/v1/raindrop/${bookmark._id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${preferences.token}`,
              },
            }).then((res) => {
              if (res.status === 200) {
                toast.style = Toast.Style.Success;
                toast.title = "Link Deleted";
                toast.message = bookmark.link;
                revalidate();
                return res.json();
              } else {
                throw new Error(res.statusText);
              }
            });
          } catch (error) {
            if (error instanceof Error) {
              toast.style = Toast.Style.Failure;
              toast.title = "Error Deleting Link";
              toast.message = error.message;
            }
          }
        },
      },
    };
    await confirmAlert(options);
  }

  const lastUpdatedDate = new Date(bookmark.lastUpdate);
  const createdDate = new Date(bookmark.created);

  function subtitle() {
    switch (preferences.additionalItemToDisplayInList) {
      case "link":
        return bookmark.link;
      case "domain":
        return bookmark.domain;
      case "excerpt":
        return bookmark.excerpt;
      case "note":
        return bookmark.note;
    }
  }

  function accessories() {
    const accessories = [];

    switch (preferences.displayDate) {
      case "lastUpdated":
        accessories.push({ date: lastUpdatedDate, tooltip: lastUpdatedDate.toLocaleString() });
        break;
      case "created":
        accessories.push({ date: createdDate, tooltip: createdDate.toLocaleString() });
        break;
    }

    if (preferences.tagsDisplay !== "none") {
      if (preferences.tagsDisplay === "all") {
        bookmark.tags.forEach((tag) => accessories.push({ tag: `#${tag}` }));
      } else {
        const tagsNumber = bookmark.tags.length - 1;
        const tagsDisplayNumber = parseInt(preferences.tagsDisplay, 10);
        const displayedTags = bookmark.tags.slice(0, tagsDisplayNumber).map((tag) => `#${tag}`);
        accessories.push(...displayedTags.map((tag) => ({ tag })));

        if (tagsNumber > tagsDisplayNumber) {
          accessories.push({ tag: `+${tagsNumber}`, tooltip: bookmark.tags.join("\n") });
        }
      }
    }

    switch (bookmark.type) {
      case "link":
        accessories.push({ icon: Icon.Link });
        break;
      case "article":
        accessories.push({ icon: Icon.FountainTip });
        break;
      case "image":
        accessories.push({ icon: Icon.Image });
        break;
      case "video":
        accessories.push({ icon: Icon.Video });
        break;
      case "audio":
        accessories.push({ icon: Icon.Music });
        break;
      case "document":
        accessories.push({ icon: Icon.Document });
        break;
    }

    return accessories;
  }

  return (
    <List.Item
      id={String(bookmark._id)}
      icon={getFavicon(bookmark.link, { fallback: "raindrop-icon.png" })}
      key={bookmark._id}
      title={{ value: bookmark.title, tooltip: bookmark.link }}
      subtitle={subtitle()}
      accessories={accessories()}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={bookmark.link} />
          <Action.CopyToClipboard title="Copy URL" content={bookmark.link} />
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
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
                    <ActionEditBookmark bookmark={bookmark} revalidate={revalidate} />
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
            }
          />
          <ActionEditBookmark bookmark={bookmark} revalidate={revalidate} />
          <Action
            onAction={handleDelete}
            title="Delete Bookmark"
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            icon={Icon.Trash}
          />
        </ActionPanel>
      }
    />
  );
}
