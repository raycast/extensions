import { Account, BskyRecord, Post, PostReason } from "../types/types";
import {
  $Typed,
  AppBskyActorDefs,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atproto/api";
import { BlueskyProfileUrlBase, PostEndHorizontalLine } from "./constants";

import { Notification as BskyNotification } from "@atproto/api/dist/client/types/app/bsky/notification/listNotifications";
import { Notification } from "../types/types";
import { NotificationReasonMapping } from "../config/notificationReasonMapping";
import { isBlockedPost, isPostView, isReasonRepost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { ViewRecord } from "@atproto/api/dist/client/types/app/bsky/embed/record";
import { getMarkdownText } from "../libs/atp";
import { getPostUrl } from "./common";
import { getReadableDate } from "./date";

export const getLikesUrl = (handle: string, uri: string) => {
  return `${getPostUrl(handle, uri)}/liked-by`;
};

export const getRepostsUrl = (handle: string, uri: string) => {
  return `${getPostUrl(handle, uri)}/reposted-by`;
};

const getImageMarkdown = (imageEmbeds: string[]) => {
  return imageEmbeds.map((image) => `![image](${image})`).join("\n");
};

export const getRepostMarkdown = (displayName: string, handle: string) => {
  const displayNameText = displayName ? `**${displayName.trim()}**` : "";

  return `
## Reposted by: ${displayNameText} [(${handle})](${BlueskyProfileUrlBase}/${handle})
---

  `;
};

export const getQuotedPostMarkdownView = async (postAuthor: string, post: ViewRecord, imageEmbeds: string[]) => {
  const { text = "" } = post.value as BskyRecord;
  const postMarkdown = (await getMarkdownText(text)).replace(/\n/g, "\n\n").replace(/^/gm, "> ");

  const postTime = getReadableDate(post.indexedAt);
  const displayNameText = post.author.displayName ? `**${post.author.displayName.trim()}**` : "";

  return `
### \`Original Post quoted by ${postAuthor}:\`

${displayNameText} _[(${post.author.handle})](${BlueskyProfileUrlBase}/${post.author.handle})_

${postMarkdown}

${getImageMarkdown(imageEmbeds)}
  
_[${postTime}](${getPostUrl(post.author.handle, post.uri)})_

---`;
};

export const getPostMarkdownView = async (post: AppBskyFeedDefs.PostView, imageEmbeds: string[]) => {
  const postMarkdown = (await getMarkdownText((post.record as BskyRecord).text))
    .replace(/\n/g, "\n\n")
    .replace(/^/gm, "> ");
  const postTime = getReadableDate(post.indexedAt);

  const displayNameText = post.author.displayName ? `**${post.author.displayName.trim()}**` : "";
  return `
${displayNameText} _[(${post.author.handle})](${BlueskyProfileUrlBase}/${post.author.handle})_

${postMarkdown}

${getImageMarkdown(imageEmbeds)}

♡ [${post.likeCount}](${getLikesUrl(post.author.handle, post.uri)})    ♻ [${post.repostCount}](${getRepostsUrl(
    post.author.handle,
    post.uri,
  )})    ↓ [${post.replyCount}](${getPostUrl(post.author.handle, post.uri)})

_[${postTime}](${getPostUrl(post.author.handle, post.uri)})_  ${
    AppBskyEmbedRecord.isView(post.embed) ? "" : PostEndHorizontalLine
  }
`;
};

export const parseAccounts = (bskyUsers: AppBskyActorDefs.ProfileView[]): Account[] => {
  const accounts: Account[] = bskyUsers.map((item) => {
    return {
      did: item.did,
      handle: item.handle,
      displayName: item.displayName ? item.displayName : "",
      avatarUrl: item.avatar ? item.avatar : "",
      description: item.description ? item.description : "",
      following: item.viewer && item.viewer.following ? true : false,
      blockedUri: item.viewer && item.viewer.blocking ? item.viewer.blocking : null,
      muted: item.viewer && item.viewer.muted ? item.viewer.muted : false,
    };
  });

  return accounts;
};

export const parseNotifications = (bskyNotifications: BskyNotification[]): Notification[] => {
  const uniquePostIds = new Set<string>();

  const notifications: Notification[] = bskyNotifications
    .filter((item) => item.cid)
    .map((item) => {
      let targetPostUri = item.reasonSubject ? item.reasonSubject : null;
      if (item.reason === "mention") {
        targetPostUri = item.uri;
      }

      const text = NotificationReasonMapping[item.reason] ? NotificationReasonMapping[item.reason] : item.reason;
      return {
        uri: item.uri,
        id: item.cid,
        text,
        reason: item.reason,
        isRead: item.isRead,
        targetPostUri,
        indexedAtDate: item.indexedAt,
        author: {
          did: item.author.did,
          handle: item.author.handle,
          blockedUri: item.author.viewer && item.author.viewer.blocking ? item.author.viewer.blocking : null,
          displayName: item.author.displayName ? item.author.displayName : "",
          avatarUrl: item.author.avatar ? item.author.avatar : "",
        },
      };
    })
    .filter((item) => {
      if (uniquePostIds.has(item.id)) {
        return false;
      } else {
        uniquePostIds.add(item.id);
        return true;
      }
    });

  return notifications;
};

export const parseFeed = async (bskyFeed: AppBskyFeedDefs.FeedViewPost[]): Promise<Post[]> => {
  const posts: Post[] = await Promise.all(
    bskyFeed
      .filter((item) => item !== null && item.post !== null)
      .filter((item) => AppBskyFeedPost.isRecord(item.post.record))
      .filter((item) => !isBlockedPost(item.reply?.root))
      .map(async (item) => {
        let postReason: PostReason = null;

        if (isReasonRepost(item.reason)) {
          const author = item.reason.by;
          postReason = {
            type: "repost",
            authorName: author.displayName || author.handle,
          };
        }

        if (item.reply && Object.keys(item.reply).length > 0 && isPostView(item.reply.parent)) {
          const { author } = item.reply.parent;
          postReason = {
            type: "reply",
            authorName: author.displayName ? author.displayName : author.handle,
          };
        }

        let imageEmbeds: string[] = [];

        if (AppBskyEmbedImages.isView(item.post.embed)) {
          imageEmbeds = item.post.embed.images.map((item) => item.thumb);
        }

        let markdownView = "";

        if (
          item.reply &&
          isPostView(item.reply.root) &&
          isPostView(item.reply.parent) &&
          item.reply.root.uri !== item.reply.parent.uri
        ) {
          let imageEmbeds: string[] = [];
          const { root } = item.reply;
          if (AppBskyEmbedImages.isView(root.embed)) {
            imageEmbeds = root.embed.images.map((item) => item.thumb);
          }

          markdownView = markdownView + (await getPostMarkdownView(root, imageEmbeds));
        }
        if (isPostView(item.reply?.parent)) {
          let imageEmbeds: string[] = [];
          const parent = item.reply.parent;
          if (AppBskyEmbedImages.isView(parent.embed)) {
            imageEmbeds = parent.embed.images.map((item) => item.thumb);
          }

          markdownView = markdownView + (await getPostMarkdownView(parent, imageEmbeds));
        }

        let quotedMarkdown = "";
        // not sure if we still need the `&& item.post.embed.record` - leave until sure
        if (AppBskyEmbedRecord.isView(item.post.embed) && item.post.embed.record) {
          const postAuthor = item.post.author.displayName ? item.post.author.displayName : item.post.author.handle;
          postReason = {
            type: "quote",
            authorName: postAuthor,
          };

          let embeddedPostImages: string[] = [];
          const embeddedPostRecord = item.post.embed.record as ViewRecord;

          if (embeddedPostRecord.embeds && embeddedPostRecord.embeds?.length > 0) {
            const embed = embeddedPostRecord.embeds[0];
            if (AppBskyEmbedImages.isView(embed)) {
              embeddedPostImages = embed.images.map((item) => item.thumb);
            }
          }

          const postValue = (item.post.embed.record as ViewRecord).value as BskyRecord;

          if (postValue && postValue.text && postValue.text.length > 0) {
            quotedMarkdown = await getQuotedPostMarkdownView(postAuthor, embeddedPostRecord, embeddedPostImages);
          }
        }

        let repostMarkdown = "";
        if (item.reason && isReasonRepost(item.reason)) {
          const repostAuthor = item.reason.by;
          const displayName = repostAuthor.displayName || "";
          repostMarkdown = getRepostMarkdown(displayName, repostAuthor.handle);
        }

        return {
          uri: item.post.uri,
          cid: item.post.cid,
          viewer: item.post.author.viewer,
          text: (item.post.record as $Typed<AppBskyFeedPost.Record>).text,
          imageEmbeds,
          reason: postReason,
          createdAt: (item.post.record as $Typed<AppBskyFeedPost.Record>).createdAt,
          createdByUser: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            blockedUri:
              // This is done for legacy reasons. "blocking" does not exist on ViewerState but we have assumed it is so we don't break anything - might remove in future
              item.post.viewer && (item.post.viewer as AppBskyFeedDefs.ViewerState & { blocking?: string }).blocking
                ? ((item.post.viewer as AppBskyFeedDefs.ViewerState & { blocking?: string }).blocking as string)
                : "",
            displayName: item.post.author.displayName ? item.post.author.displayName : "",
            avatarUrl: item.post.author.avatar ? item.post.author.avatar : "",
          },
          likeUri: item.post.viewer && item.post.viewer.like ? item.post.viewer.like : "",
          metrics: {
            likeCount: item.post.likeCount ? item.post.likeCount : 0,
            replyCount: item.post.replyCount ? item.post.replyCount : 0,
            repostCount: item.post.repostCount ? item.post.repostCount : 0,
          },
          markdownView:
            repostMarkdown + markdownView + (await getPostMarkdownView(item.post, imageEmbeds)) + quotedMarkdown,
        };
      }),
  );

  const uniquePosts: Post[] = [];
  const uniqueUris = new Set();

  posts.forEach((post) => {
    if (!uniqueUris.has(post.uri)) {
      uniqueUris.add(post.uri);
      uniquePosts.push(post);
    }
  });

  return uniquePosts;
};
