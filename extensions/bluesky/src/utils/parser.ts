import { AppBskyActorDefs, AppBskyFeedDefs } from "@atproto/api";
import { BlueskyImageEmbedType, BlueskyPostEmbedType, BlueskyProfileUrlBase, PostEndHorizontalLine } from "./constants";
import { BskyRecord, Post, User } from "../types/types";
import { getMarkdownText, getRKey } from "../libs/atp";

import { Notification as BskyNotification } from "@atproto/api/dist/client/types/app/bsky/notification/listNotifications";
import { Notification } from "../types/types";
import { NotificationReasonMapping } from "../config/notificationReasonMapping";
import { ViewImage } from "@atproto/api/dist/client/types/app/bsky/embed/images";
import { ViewRecord } from "@atproto/api/dist/client/types/app/bsky/embed/record";
import { getReadableDate } from "./date";

export const getPostUrl = (handle: string, uri: string) => {
  return `${BlueskyProfileUrlBase}/${handle}/post/${getRKey(uri)}`;
};

const getImageMarkdown = (imageEmbeds: string[]) => {
  return imageEmbeds.map((image) => `![image](${image})`).join("\n");
};

export const getQuotedPostMarkdownView = async (postAuthor: string, post: ViewRecord, imageEmbeds: string[]) => {
  const postMarkdown = (await getMarkdownText((post.value as BskyRecord).text))
    .replace(/\n/g, "\n\n")
    .replace(/^/gm, "> ");

  const postTime = getReadableDate(post.indexedAt);

  return `
### \`Original Post quoted by ${postAuthor}:\`

**${post.author.displayName?.trim()}** _[(${post.author.handle})](${BlueskyProfileUrlBase}/${post.author.handle})_

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

  return `
**${post.author.displayName?.trim()}** _[(${post.author.handle})](${BlueskyProfileUrlBase}/${post.author.handle})_

${postMarkdown}

${getImageMarkdown(imageEmbeds)}

♡ ${post.likeCount}    ♻ ${post.repostCount}    ↓${post.replyCount}

_[${postTime}](${getPostUrl(post.author.handle, post.uri)})_  ${
    post.embed?.$type === BlueskyPostEmbedType ? "" : PostEndHorizontalLine
  }
`;
};

export const parseUsers = (bskyUsers: AppBskyActorDefs.ProfileView[]): User[] => {
  const users: User[] = bskyUsers.map((item) => {
    return {
      did: item.did,
      handle: item.handle,
      displayName: item.displayName ? item.displayName : "",
      avatarUrl: item.avatar ? item.avatar : "",
      description: item.description ? item.description : "",
      following: item.viewer && item.viewer.following ? true : false,
      muted: item.viewer && item.viewer.muted ? item.viewer.muted : false,
    };
  });

  return users;
};

export const parseNotifications = (bskyNotifications: BskyNotification[]): Notification[] => {
  const uniquePostIds = new Set<string>();

  const notifications: Notification[] = bskyNotifications
    .filter((item) => item.cid)
    .map((item) => {
      const text = NotificationReasonMapping[item.reason] ? NotificationReasonMapping[item.reason] : item.reason;
      return {
        uri: item.uri,
        id: item.cid,
        text,
        reason: item.reason,
        targetPostUri: item.reasonSubject ? item.reasonSubject : null,
        indexedAtDate: item.indexedAt,
        author: {
          did: item.author.did,
          handle: item.author.handle,
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
      .filter((item) => item.post.record)
      .map(async (item) => {
        let imageEmbeds: string[] = [];

        if (item.post.embed?.$type === BlueskyImageEmbedType) {
          imageEmbeds = (item.post.embed.images as ViewImage[]).map((item: ViewImage) => item.thumb);
        }

        let markdownView = "";

        if (item.reply?.parent && item.reply?.root.uri !== item.reply?.parent.uri) {
          let parentImageEmbeds: string[] = [];
          if (item.reply.parent.embed?.$type === BlueskyImageEmbedType) {
            parentImageEmbeds = (item.reply.parent.embed.images as ViewImage[]).map((item: ViewImage) => item.thumb);
          }

          markdownView = markdownView + (await getPostMarkdownView(item.reply.root, parentImageEmbeds));
        }

        if (item.reply?.root) {
          let rootImageEmbeds: string[] = [];
          if (item.reply.root.embed?.$type === BlueskyImageEmbedType) {
            rootImageEmbeds = (item.reply.root.embed.images as ViewImage[]).map((item: ViewImage) => item.thumb);
          }

          markdownView = markdownView + (await getPostMarkdownView(item.reply.parent, rootImageEmbeds));
        }

        let quotedMarkdown = "";
        if (item.post.embed?.$type === BlueskyPostEmbedType && item.post.embed.record) {
          let embeddedPostImages: string[] = [];
          const embeddedPostRecord = item.post.embed.record as ViewRecord;

          if (embeddedPostRecord.embeds && embeddedPostRecord.embeds?.length > 0) {
            if (embeddedPostRecord.embeds[0]?.$type === BlueskyImageEmbedType) {
              embeddedPostImages = (embeddedPostRecord.embeds[0].images as ViewImage[]).map(
                (item: ViewImage) => item.thumb
              );
            }
          }

          const postAuthor = item.post.author.displayName ? item.post.author.displayName : item.post.author.handle;

          const postValue = (item.post.embed.record as ViewRecord).value as BskyRecord;

          if (postValue && postValue.text && postValue.text.length > 0) {
            quotedMarkdown = await getQuotedPostMarkdownView(postAuthor, embeddedPostRecord, embeddedPostImages);
          }
        }

        return {
          uri: item.post.uri,
          cid: item.post.cid,
          viewer: item.post.author.viewer,
          text: (item.post.record as BskyRecord).text,
          imageEmbeds,
          createdAt: (item.post.record as BskyRecord).createdAt,
          createdByUser: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            displayName: item.post.author.displayName ? item.post.author.displayName : "",
            avatarUrl: item.post.author.avatar ? item.post.author.avatar : "",
          },
          likeUri: item.post.viewer && item.post.viewer.like ? item.post.viewer.like : "",
          metrics: {
            likeCount: item.post.likeCount ? item.post.likeCount : 0,
            replyCount: item.post.replyCount ? item.post.replyCount : 0,
            repostCount: item.post.repostCount ? item.post.repostCount : 0,
          },
          markdownView: markdownView + (await getPostMarkdownView(item.post, imageEmbeds)) + quotedMarkdown,
        };
      })
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
