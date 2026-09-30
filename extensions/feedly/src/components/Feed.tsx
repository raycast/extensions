import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { Feed as IFeed } from "../types/feed.types";
import fetch from "node-fetch";

const Feed = ({ id, title }: { id: IFeed["id"]; title: IFeed["title"] }) => {
  const { isLoading, data } = useFetch<IFeed>(`https://cloud.feedly.com/v3/streams/contents?streamId=${id}`, {
    keepPreviousData: true,
    headers: {
      Authorization: getPreferenceValues().feedlyAccessToken,
    },
  });

  const handleMarkAsSaved = async (id: string) => {
    const toast = await showToast(Toast.Style.Animated, "'Saving to Read Later'");
    fetch(`https://cloud.feedly.com/v3/markers`, {
      method: "POST",
      headers: {
        Authorization: getPreferenceValues().feedlyAccessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "markAsSaved",
        type: "entries",
        entryIds: [id],
      }),
    })
      .then((res) => {
        if (res.ok) {
          toast.title = "Success";
          toast.style = Toast.Style.Success;
          toast.message = "Saved to Read Later";
        } else {
          toast.title = "Error";
          toast.style = Toast.Style.Failure;
          toast.message = "Something went wrong";
        }
      })
      .catch((error) => {
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
        toast.message = error.message;
      });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search in ${title}...`} navigationTitle={`Feedly: ${title}`}>
      {data?.items
        ?.sort?.((a, b) => b.published - a.published)
        .map?.((item) => {
          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={item?.title || "Title not found."}
              accessories={[
                {
                  date: new Date(item.published),
                  tooltip: "Published",
                },
                {
                  text: item?.unread ? "Unread" : null,
                },
              ]}
              icon={{ source: item.visual?.edgeCacheUrl ?? Icon.Image }}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open"
                    icon={Icon.List}
                    target={
                      <Detail
                        markdown={new NodeHtmlMarkdown().translate(
                          item?.content?.content ?? item.summary?.content ?? ""
                        )}
                        actions={
                          <ActionPanel>
                            <Action.OpenInBrowser url={item.canonicalUrl} />
                            <Action
                              title="Save to Read Later"
                              icon={Icon.Bookmark}
                              shortcut={{ modifiers: ["cmd"], key: "s" }}
                              onAction={() => handleMarkAsSaved(item.id)}
                            />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                  <Action.OpenInBrowser url={item.canonicalUrl} />
                  <Action
                    title="Save to Read Later"
                    icon={Icon.Bookmark}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => handleMarkAsSaved(item.id)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
};

export default Feed;
