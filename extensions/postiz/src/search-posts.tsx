import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { compareDesc, endOfMonth, format, getISOWeek, startOfMonth, subDays } from "date-fns";
import { useFetch } from "@raycast/utils";
import {
  buildPostizApiUrl,
  buildPostizPlatformUrl,
  parsePostizResponse,
  POSTIZ_HEADERS,
  STATE_COLORS,
  STATE_ICONS,
} from "./postiz";
import { Identifier, Post } from "./types";
import CreatePost from "./create-post";
import TurndownService from "turndown";

const { postiz_version } = getPreferenceValues<Preferences>();

const turndownService = new TurndownService();
const generateMarkdown = (post: Post) => {
  switch (post.integration.providerIdentifier) {
    case Identifier.X:
      return post.content
        .replace(/@(\w+)/g, (match, handle) => {
          return postiz_version === "1"
            ? `[${match}](https://x.com/${handle})`
            : `<a href="https://x.com/${handle}">${match}</a>`;
        })
        .replace(/#(\w+)/g, (match, hashtag) => {
          return postiz_version === "1"
            ? `[${match}](https://x.com/hashtag/${hashtag})`
            : `<a href="https://x.com/hashtag/${hashtag}">${match}</a>`;
        });
    default:
      return post.content;
  }
};
const getProviderIdentifierIcon = (providerIdentifier: string) => `platforms/${providerIdentifier}.png`;
export default function SearchPosts() {
  type Display = "day" | "week" | "month";
  const [display, setDisplay] = useState<Display>("week");
  const date = useMemo(() => new Date(), []);
  const { startDate, endDate } = useMemo(() => {
    switch (display) {
      case "day":
        return { startDate: date, endDate: date };
      case "week":
        return { startDate: subDays(date, 6), endDate: date };
      case "month":
        return { startDate: startOfMonth(date), endDate: endOfMonth(date) };
    }
  }, [date, display]);

  const {
    isLoading,
    data: posts,
    revalidate,
    mutate,
  } = useFetch(
    buildPostizApiUrl(
      "posts",
      postiz_version === "1"
        ? {
            display: "week",
            day: date.getDay().toString(),
            week: getISOWeek(date).toString(),
            month: (date.getMonth() + 1).toString(),
            year: date.getFullYear().toString(),
          }
        : {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
    ),
    {
      headers: POSTIZ_HEADERS,
      parseResponse: parsePostizResponse,
      mapResult(result) {
        return {
          data: (result as { posts: Post[] }).posts.sort((a, b) =>
            compareDesc(new Date(a.publishDate), new Date(b.publishDate)),
          ),
        };
      },
      initialData: [],
    },
  );

  const confirmAndDelete = async (postId: string) => {
    const options: Alert.Options = {
      icon: { source: Icon.Warning, tintColor: Color.Red },
      title: "Are you sure?",
      message: "Are you sure you want to delete this post?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Yes, delete it",
      },
      dismissAction: {
        title: "No, cancel!",
      },
    };
    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting", postId);
    try {
      await mutate(
        fetch(buildPostizApiUrl(`posts/${postId}`), {
          method: "DELETE",
          headers: POSTIZ_HEADERS,
        }).then(parsePostizResponse),
        {
          optimisticUpdate(data) {
            return data.filter((p) => p.id !== postId);
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  };
  const subtitle = `${format(postiz_version === "1" ? subDays(date, 6) : startDate, "MM/dd/yyyy")} - ${format(endDate, "MM/dd/yyyy")}`;
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        postiz_version === "1" ? undefined : (
          <List.Dropdown tooltip="Display" onChange={(d) => setDisplay(d as Display)} defaultValue="week" storeValue>
            <List.Dropdown.Item icon={Icon.Calendar} title="Day" value="day" />
            <List.Dropdown.Item icon={Icon.Calendar} title="Week" value="week" />
            <List.Dropdown.Item icon={Icon.Calendar} title="Month" value="month" />
          </List.Dropdown>
        )
      }
    >
      <List.EmptyView title="No Results" description={subtitle} />
      <List.Section title="Today" subtitle={subtitle}>
        {posts.map((post) => (
          <List.Item
            key={post.id}
            icon={post.integration.picture}
            title={{ value: `${post.id.slice(0, 6)}...`, tooltip: post.id }}
            accessories={[
              {
                icon: getProviderIdentifierIcon(post.integration.providerIdentifier),
                tooltip: post.integration.providerIdentifier,
              },
              { icon: { source: STATE_ICONS[post.state], tintColor: STATE_COLORS[post.state] }, tooltip: post.state },
              { date: new Date(post.publishDate) },
            ]}
            detail={
              <List.Item.Detail
                markdown={
                  postiz_version === "1" ? generateMarkdown(post) : turndownService.turndown(generateMarkdown(post))
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Provider"
                      icon={getProviderIdentifierIcon(post.integration.providerIdentifier)}
                    />
                    <List.Item.Detail.Metadata.TagList title="State">
                      <List.Item.Detail.Metadata.TagList.Item text={post.state} color={STATE_COLORS[post.state]} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Publish Date" text={post.publishDate} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {post.releaseURL && (
                  <Action.OpenInBrowser
                    icon={getProviderIdentifierIcon(post.integration.providerIdentifier)}
                    title="View Post"
                    url={post.releaseURL}
                  />
                )}
                <Action.OpenInBrowser
                  icon={Icon.Eye}
                  title="Preview Post"
                  url={buildPostizPlatformUrl(`p/${post.id}`)}
                />
                <Action.CopyToClipboard
                  title="Share with a Client"
                  content={buildPostizPlatformUrl(`p/${post.id}`)}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Post"
                  target={<CreatePost />}
                  onPop={revalidate}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Post"
                  onAction={() => confirmAndDelete(post.id)}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
