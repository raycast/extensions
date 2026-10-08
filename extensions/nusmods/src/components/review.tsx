import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
// @ts-expect-error No declaration file for turndown
import TurndownService from "turndown";
import * as z from "zod/mini";
import {
  DisqusPost,
  DisqusThread,
  getDisqusListPostApiUrl,
  getDisqusThreadDetailApiUrl,
  PostListResultResponseSchema,
  ThreadDetailsResponseSchema,
} from "../utils/disqus";
import { CourseDetails, getModuleWebUrl } from "../utils/nusmods";

const td = new TurndownService();

export const ReviewList: React.FC<{
  courseDetail: CourseDetails;
  apiKey?: string;
}> = (props) => {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.disqus_api_key ?? "";

  const {
    isLoading: isLoadingThread,
    data: threadData,
    error: threadError,
  } = useFetch(getDisqusThreadDetailApiUrl(apiKey, props.courseDetail.moduleCode), {
    parseResponse: parseThreadResponse,
    execute: !!apiKey,
  });

  const {
    isLoading: isLoadingPosts,
    data: postsData,
    error: postsError,
  } = useFetch(getDisqusListPostApiUrl(apiKey, threadData?.id ?? ""), {
    parseResponse: parseListPostResponse,
    execute: !!apiKey && !!threadData?.id,
  });

  const nusModsUrl = getModuleWebUrl(props.courseDetail.moduleCode);
  const isLoading = isLoadingThread || isLoadingPosts;
  const error = threadError || postsError;

  if (!apiKey) {
    return (
      <List navigationTitle={`${props.courseDetail.moduleCode} - Reviews & Comments`}>
        <List.EmptyView
          icon={Icon.Warning}
          title="No API key found"
          description="Please set a Disqus API key in extension preferences."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Get Disqus API Key"
                url="https://disqus.com/api/applications/register"
                icon={Icon.Globe}
              />
              <Action.OpenInBrowser title="View Setup Guide" url="https://www.raycast.com/wxiaoyun/nusmods" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${props.courseDetail.moduleCode} - Reviews & Comments`}
      isShowingDetail
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Unable to load comments"
          description={"Failed to fetch thread details. Please check your API key in extension preferences."}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Get Disqus API Key"
                url="https://disqus.com/api/applications/register"
                icon={Icon.Globe}
              />
              <Action.OpenInBrowser title="View Setup Guide" url="https://www.raycast.com/wxiaoyun/nusmods" />
            </ActionPanel>
          }
        />
      ) : !postsData ? (
        <List.EmptyView icon={Icon.Clock} title="Loading..." description="Fetching comments..." />
      ) : Array.isArray(postsData) && postsData.length === 0 ? (
        <List.EmptyView
          icon={Icon.SpeechBubble}
          title="No comments yet"
          description={`Be the first to comment on ${props.courseDetail.moduleCode}!`}
        />
      ) : (
        postsData.map((post) => <PostListItem key={post.id} post={post} nusModsUrl={nusModsUrl} />)
      )}
    </List>
  );
};

const PostListItem: React.FC<{
  post: DisqusPost;
  nusModsUrl: string;
}> = ({ post, nusModsUrl }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAuthorName = () => {
    if (post.author.isAnonymous) {
      return "Anonymous";
    }
    return post.author.name || post.author.username || "Unknown User";
  };

  const getStatusIcon = () => {
    if (post.isDeleted) return { icon: Icon.Trash, color: Color.Red };
    if (post.isSpam) return { icon: Icon.Warning, color: Color.Orange };
    if (!post.isApproved) return { icon: Icon.Clock, color: Color.Yellow };
    return { icon: Icon.CheckCircle, color: Color.Green };
  };

  const statusInfo = getStatusIcon();
  const authorName = getAuthorName();
  const message = useMemo(() => td.turndown(post.message), [post.message]);

  return (
    <List.Item
      icon={post.author.avatar.cache}
      title={authorName}
      subtitle={post.isEdited ? "(edited)" : undefined}
      accessories={[
        { icon: Icon.ThumbsUp, text: post.likes.toString() },
        { icon: Icon.ThumbsDown, text: post.dislikes.toString() },
      ]}
      detail={
        <List.Item.Detail
          markdown={message}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Author" text={authorName} icon={post.author.avatar.cache} />
              {!post.author.isAnonymous && post.author.username && (
                <List.Item.Detail.Metadata.Label title="Username" text={`@${post.author.username}`} />
              )}
              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="Posted" text={formatDate(post.createdAt)} />
              {post.isEdited && <List.Item.Detail.Metadata.Label title="Edited" text="Yes" icon={Icon.Pencil} />}
              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="Status" icon={statusInfo.icon} />
              {post.isDeleted && <List.Item.Detail.Metadata.Label title="" text="Deleted" />}
              {post.isSpam && <List.Item.Detail.Metadata.Label title="" text="Marked as Spam" />}
              <List.Item.Detail.Metadata.Separator />

              {!post.author.isAnonymous && post.author.profileUrl && (
                <List.Item.Detail.Metadata.Link title="Profile" target={post.author.profileUrl} text="View on Disqus" />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Course in NUSMods" url={nusModsUrl} />
          {!post.author.isAnonymous && post.author.profileUrl && (
            <Action.OpenInBrowser title="View Author Profile" url={post.author.profileUrl} />
          )}
          <Action.CopyToClipboard
            title="Copy Comment"
            content={post.message}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
};

async function parseThreadResponse(res: Response): Promise<DisqusThread | null> {
  if (res.status === 403) {
    showToast({
      title: "Invalid API key",
      message: "Please check your API key and try again.",
      style: Toast.Style.Failure,
    });
    throw new Error("Invalid API key");
  }

  if (!res.ok && res.status >= 500) {
    console.error("Failed to fetch thread details:", res.status, res.statusText);
    showToast({
      title: "Failed to fetch thread details",
      message: "Please check your API key and try again.",
      style: Toast.Style.Failure,
    });
    throw new Error("Failed to fetch thread details");
  }

  const data = await res.json();
  if (!data) {
    console.error("Failed to unmarshal thread details");
    throw new Error("Failed to unmarshal thread details");
  }

  const parseResult = await ThreadDetailsResponseSchema.safeParseAsync(data);
  if (!parseResult.success) {
    console.error("Thread validation error:", z.prettifyError(parseResult.error), JSON.stringify(data, null, 2));
    showToast({
      title: "Validation error",
      message: "Unexpected thread details data received from Disqus API.",
      style: Toast.Style.Failure,
    });
    throw new Error("Validation error");
  }

  const parsedData = parseResult.data;

  if (parsedData.code !== 0 || typeof parsedData.response === "string") {
    console.error("Thread API returned error code:", parsedData.code, parsedData.response);
    showToast({
      title: "Thread API returned error code",
      message: "Please try again later.",
      style: Toast.Style.Failure,
    });
    throw new Error("Thread API returned error code");
  }

  return parsedData.response;
}

async function parseListPostResponse(res: Response): Promise<DisqusPost[] | null> {
  if (res.status === 403) {
    showToast({
      title: "Invalid API key",
      message: "Please check your API key and try again.",
      style: Toast.Style.Failure,
    });
    throw new Error("Invalid API key");
  }

  if (!res.ok && res.status >= 500) {
    console.error("Failed to fetch Disqus posts:", res.status, res.statusText);
    showToast({
      title: "Failed to fetch Disqus posts",
      message: "Please try again later.",
      style: Toast.Style.Failure,
    });
    throw new Error("Failed to fetch Disqus posts");
  }

  const data = await res.json();
  if (!data) {
    console.error("Failed to unmarshal Disqus posts");
    showToast({
      title: "Failed to unmarshal Disqus posts",
      message: "Please try again later.",
      style: Toast.Style.Failure,
    });
    throw new Error("Failed to unmarshal Disqus posts");
  }

  const parseResult = await PostListResultResponseSchema.safeParseAsync(data);
  if (!parseResult.success) {
    console.error(
      "Failed to validate Disqus posts data:",
      z.prettifyError(parseResult.error),
      JSON.stringify(data, null, 2),
    );
    showToast({
      title: "Validation error",
      message: "Unexpected Disqus posts data received from Disqus API.",
      style: Toast.Style.Failure,
    });
    throw new Error("Validation error");
  }

  const parsedData = parseResult.data;

  if (parsedData.code !== 0 || typeof parsedData.response === "string") {
    console.error("Failed to fetch Disqus posts:", parsedData.code, parsedData.response);
    showToast({
      title: "Failed to fetch Disqus posts",
      message: "Please try again later.",
      style: Toast.Style.Failure,
    });
    throw new Error("Failed to fetch Disqus posts");
  }

  const response = parsedData.response;
  response.sort((a, b) => {
    return b.likes - b.dislikes - (a.likes - a.dislikes);
  });

  return response;
}
