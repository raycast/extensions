import { Account, BskyRecord, Post, PostReason } from "../types/types";
import { AppBskyActorDefs, AppBskyFeedDefs } from "@atproto/api";
import {
  BlueskyImageEmbedType,
  BlueskyPostEmbedType,
  BlueskyProfileUrlBase,
  BlueskyRepostType,
  PostEndHorizontalLine,
} from "./constants";

import { Notification as BskyNotification } from "@atproto/api/dist/client/types/app/bsky/notification/listNotifications";
import { Notification } from "../types/types";
import { NotificationReasonMapping } from "../config/notificationReasonMapping";
import { PostView, ReasonRepost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { ViewImage } from "@atproto/api/dist/client/types/app/bsky/embed/images";
import { ViewRecord } from "@atproto/api/dist/client/types/app/bsky/embed/record";
import { getMarkdownText } from "../libs/atp";
import { getPostUrl } from "./common";
import { getReadableDate } from "./date";
import { ProfileViewBasic } from "@atproto/api/dist/client/types/app/bsky/actor/defs";

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
    post.embed?.$type === BlueskyPostEmbedType ? "" : PostEndHorizontalLine
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
      .filter((item) => item.post.record)
      .filter((item) => item.reply?.root.blocked !== true)
      .map(async (item) => {
        let postReason: PostReason = null;

        if (item.reason && item.reason.$type === BlueskyRepostType) {
          const author = (item.reason as ReasonRepost).by;
          postReason = {
            type: "repost",
            authorName: author.displayName ? author.displayName : author.handle,
          };
        }

        if (item.reply && Object.keys(item.reply).length > 0 && item.reply.parent.notFound !== true) {
          const author = item.reply.parent.author as ProfileViewBasic;
          postReason = {
            type: "reply",
            authorName: author.displayName ? author.displayName : author.handle,
          };
        }

        let imageEmbeds: string[] = [];

        if (item.post.embed?.$type === BlueskyImageEmbedType) {
          imageEmbeds = (item.post.embed.images as ViewImage[]).map((item: ViewImage) => item.thumb);
        }

        let markdownView = "";

        if (item.reply?.root && item.reply?.root.uri !== item.reply?.parent.uri && item.reply.root.notFound !== true) {
          let imageEmbeds: string[] = [];
          const root = item.reply.root as PostView;
          if (root.embed?.$type === BlueskyImageEmbedType) {
            imageEmbeds = (root.embed.images as ViewImage[]).map((item: ViewImage) => item.thumb);
          }

          markdownView = markdownView + (await getPostMarkdownView(root, imageEmbeds));
        }

        if (item.reply?.parent && item.reply.parent.notFound !== true) {
          let imageEmbeds: string[] = [];
          const parent = item.reply.parent as PostView;
          if (parent.embed?.$type === BlueskyImageEmbedType) {
            imageEmbeds = (parent.embed.images as ViewImage[]).map((item: ViewImage) => item.thumb);
          }

          markdownView = markdownView + (await getPostMarkdownView(parent, imageEmbeds));
        }

        let quotedMarkdown = "";
        if (item.post.embed?.$type === BlueskyPostEmbedType && item.post.embed.record) {
          const postAuthor = item.post.author.displayName ? item.post.author.displayName : item.post.author.handle;
          postReason = {
            type: "quote",
            authorName: postAuthor,
          };

          let embeddedPostImages: string[] = [];
          const embeddedPostRecord = item.post.embed.record as ViewRecord;

          if (embeddedPostRecord.embeds && embeddedPostRecord.embeds?.length > 0) {
            if (embeddedPostRecord.embeds[0]?.$type === BlueskyImageEmbedType) {
              embeddedPostImages = (embeddedPostRecord.embeds[0].images as ViewImage[]).map(
                (item: ViewImage) => item.thumb,
              );
            }
          }

          const postValue = (item.post.embed.record as ViewRecord).value as BskyRecord;

          if (postValue && postValue.text && postValue.text.length > 0) {
            quotedMarkdown = await getQuotedPostMarkdownView(postAuthor, embeddedPostRecord, embeddedPostImages);
          }
        }

        let repostMarkdown = "";
        if (item.reason && item.reason.$type === BlueskyRepostType && item.post.embed?.$type !== BlueskyPostEmbedType) {
          const repostAuthor = item.reason.by as AppBskyActorDefs.ProfileViewBasic;
          const displayName = repostAuthor.displayName ? repostAuthor.displayName : "";
          repostMarkdown = getRepostMarkdown(displayName, repostAuthor.handle);
        }

        return {
          uri: item.post.uri,
          cid: item.post.cid,
          viewer: item.post.author.viewer,
          text: (item.post.record as BskyRecord).text,
          imageEmbeds,
          reason: postReason,
          createdAt: (item.post.record as BskyRecord).createdAt,
          createdByUser: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            blockedUri: item.post.viewer && item.post.viewer.blocking ? (item.post.viewer.blocking as string) : "",
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
