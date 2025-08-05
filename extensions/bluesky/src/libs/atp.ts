import {
  ATPCredentialsHashKey,
  ATPSessionStorageKey,
  BlueskyFeedType,
  BlueskyProfileUrlBase,
  BlueskyQuoteType,
  FirstSignInSuccessToast,
} from "../utils/constants";
import { ATSessionResponse, Account, CredentialsHashStore, Notification, PostReference } from "../types/types";
import {
  AppBskyActorSearchActors,
  AppBskyFeedGetAuthorFeed,
  AppBskyFeedGetTimeline,
  AppBskyFeedLike,
  AppBskyFeedPost,
  AppBskyGraphGetBlocks,
  AppBskyGraphGetMutes,
  AppBskyNotificationListNotifications,
  AtpSessionData,
  AtpAgent,
  ComAtprotoRepoDeleteRecord,
  ComAtprotoRepoListRecords,
  RichText,
} from "@atproto/api";
import { clearLocalStore, getItemFromLocalStore } from "../utils/localStore";
import { createHashKey, showSuccessToast } from "../utils/common";

import { AppPasswordRegex } from "../config/config";
import { AtUri } from "@atproto/uri";
import { LocalStorage } from "@raycast/api";
import { clearCache } from "../utils/cacheStore";
import "cross-fetch/polyfill";
import { getPreferences } from "../utils/preference";
import FormData from "cross-fetch";
//@ts-expect-error Incompatible FormData Types
global.FormData = FormData; // we do this to make atproto client happy

const agent = new AtpAgent({
  service: getPreferences().service,
  persistSession: (sessionEvent, session) => {
    switch (sessionEvent) {
      case "create":
      case "update":
        LocalStorage.setItem(ATPSessionStorageKey, JSON.stringify(session));
        break;
      case "expired":
      case "create-failed":
        LocalStorage.removeItem(ATPSessionStorageKey);
        clearCache();
        break;
    }
  },
});

export const getSignedInAccountHandle = async () => {
  const session = await getExistingSession();
  return session?.handle;
};

export const getExistingSession = async () => {
  return await getItemFromLocalStore<AtpSessionData>(ATPSessionStorageKey);
};

export const resolveHandle = async (handle: string): Promise<boolean> => {
  try {
    await agent.resolveHandle({ handle });
    return true;
  } catch (error) {
    return false;
  }
};

export const getSearchPosts = async (searchTerm: string) => {
  const response = await agent.app.bsky.feed.searchPosts({ q: searchTerm, sort: "latest" });
  if (response.data) {
    const postResponse = response.data.posts.map((item) => ({
      post: item,
    }));
    return {
      feed: postResponse,
    };
  }
  return null;
};

export const getTimelinePosts = async (cursor: string | null, limit = 10) => {
  const requestObject: AppBskyFeedGetTimeline.QueryParams = {
    limit,
  };
  if (cursor) {
    requestObject.cursor = cursor;
  }

  const response = await agent.getTimeline(requestObject);

  if (response.data) {
    return response.data;
  }

  return null;
};

export const getLikePosts = async (handle: string, cursor: string | null, limit = 10) => {
  const requestObject: ComAtprotoRepoListRecords.QueryParams = {
    collection: "app.bsky.feed.like",
    repo: handle,
    limit,
  };

  if (cursor) {
    requestObject.cursor = cursor;
  }

  const authorLikesResponse = await agent.com.atproto.repo.listRecords(requestObject);
  const newCursor = authorLikesResponse.data?.cursor;

  const uris =
    authorLikesResponse.data?.records.map((record) => (record.value as AppBskyFeedLike.Record).subject.uri) || [];

  const response = await Promise.all(
    uris
      .map(async (uri) => {
        try {
          const response = await getPostThread(uri);
          if (response && response.thread) {
            return response.thread;
          }
        } catch {
          return null;
        }
      })
      .filter((thread) => thread !== null),
  );

  return {
    cursor: newCursor,
    feed: response,
  };
};

export const getAccountPosts = async (handle: string, cursor: string | null, limit = 10) => {
  const requestObject: AppBskyFeedGetAuthorFeed.QueryParams = {
    actor: handle,
    limit,
  };
  if (cursor) {
    requestObject.cursor = cursor;
  }

  try {
    const response = await agent.getAuthorFeed(requestObject);
    if (response.data) {
      return response.data;
    }

    return null;
  } catch {
    return null;
  }
};

export const getNotifications = async (cursor: string | null, limit = 10) => {
  const requestObject: AppBskyNotificationListNotifications.QueryParams = {
    limit,
  };

  if (cursor) {
    requestObject.cursor = cursor;
  }

  const response = await agent.listNotifications(requestObject);

  if (response.data) {
    return response.data;
  }

  return null;
};

export const getRKey = (uri: string) => {
  return new AtUri(uri).rkey;
};

export const createPost = async (postText: string, postReference?: PostReference) => {
  const rt = new RichText({ text: postText });
  await rt.detectFacets(agent);

  const postRecord: Partial<AppBskyFeedPost.Record> & Omit<AppBskyFeedPost.Record, "createdAt"> = {
    $type: BlueskyFeedType,
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  };

  if (postReference && postReference.reason === "reply") {
    postRecord.reply = postReference.replyRef;
  }

  if (postReference && postReference.reason === "quote") {
    postRecord.embed = {
      record: postReference.quotedRef.record,
      $type: BlueskyQuoteType,
    };
  }

  await agent.post(postRecord);
};

export const like = async (uri: string, cid: string) => {
  return await agent.like(uri, cid);
};

export const unlike = async (likeUri: string) => {
  await agent.deleteLike(likeUri);
};

export const repost = async (uri: string, cid: string) => {
  await agent.repost(uri, cid);
};
export const follow = async (did: string) => {
  await agent.follow(did);
};

export const mute = async (did: string) => {
  await agent.mute(did);
};

export const unmute = async (did: string) => {
  await agent.unmute(did);
};

export const deleteFollow = async (followUri: string) => {
  await agent.deleteFollow(followUri);
};

export const getProfile = async (handle: string) => {
  const response = await agent.getProfile({ actor: handle });

  if (response.data) {
    return response.data;
  }

  return null;
};

export const resolveATUri = async (notification: Notification): Promise<string> => {
  if (["reply", "quote", "mention"].includes(notification.reason)) {
    const atUri = new AtUri(notification.uri);
    return `${BlueskyProfileUrlBase}/${notification.author.handle}/post/${atUri.rkey}`;
  }

  if ((notification.reason === "like" || notification.reason === "repost") && notification.targetPostUri) {
    const accountHandle = await getSignedInAccountHandle();
    const atUri = new AtUri(notification.targetPostUri);
    return `${BlueskyProfileUrlBase}/${accountHandle}/post/${atUri.rkey}`;
  }

  return `${BlueskyProfileUrlBase}/${notification.author.handle}`;
};

export const createNewSession = async (): Promise<ATSessionResponse> => {
  try {
    const { accountId, password, service } = getPreferences();

    if (!AppPasswordRegex.test(password)) {
      const response: ATSessionResponse = {
        status: "session-creation-failed",
        message: "Please use an app password instead of your account password.",
      };

      return response;
    }

    const identifier = accountId.startsWith("@") ? accountId.slice(1) : accountId;

    await agent.login({ identifier, password });

    const hashStore: CredentialsHashStore = {
      key: createHashKey(`${accountId}:${password}:${service}`),
    };

    await LocalStorage.setItem(ATPCredentialsHashKey, JSON.stringify(hashStore));
    showSuccessToast(FirstSignInSuccessToast);

    const response: ATSessionResponse = {
      status: "new-session-created",
    };

    return response;
  } catch (e: unknown) {
    const response: ATSessionResponse = {
      status: "session-creation-failed",
      message: e instanceof Error ? e.message : "An unknown error occurred",
    };

    return response;
  }
};

export const getPostThread = async (uri: string) => {
  const response = await agent.getPostThread({ uri });

  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await agent.countUnreadNotifications();
  return response.data.count;
};

export const markNotificationsAsRead = async () => {
  return await agent.updateSeenNotifications();
};

export const getMarkdownText = async (text: string) => {
  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  let markdown = "";

  for (const segment of rt.segments()) {
    if (segment.isLink()) {
      markdown += `[${segment.text}](${segment.link?.uri})`;
    } else if (segment.isMention()) {
      markdown += `[${segment.text}](${BlueskyProfileUrlBase}/${segment.mention?.did})`;
    } else {
      markdown += segment.text;
    }
  }

  return markdown;
};

export const getMutedAccounts = async (cursor: string | null) => {
  const requestObject: AppBskyGraphGetMutes.QueryParams = {
    limit: 100,
  };

  if (cursor) {
    requestObject.cursor = cursor;
  }

  const response = await agent.app.bsky.graph.getMutes(requestObject);

  if (response.data) {
    return response.data;
  }

  return null;
};

export const block = async (account: Account) => {
  if (agent.session === undefined) {
    return;
  }

  await agent.app.bsky.graph.block.create(
    { repo: agent.session.did },
    {
      createdAt: new Date().toISOString(),
      subject: account.did,
    },
  );
};

export const unblock = async (account: Account) => {
  if (!account.blockedUri || agent.session === undefined) {
    return;
  }

  const aturi = new AtUri(account.blockedUri);

  const requestObject: ComAtprotoRepoDeleteRecord.InputSchema = {
    rkey: aturi.rkey,
    repo: agent.session.did,
    collection: "app.bsky.graph.block",
  };

  await agent.com.atproto.repo.deleteRecord(requestObject);
};

export const getBlockedAccounts = async (cursor: string | null) => {
  const requestObject: AppBskyGraphGetBlocks.QueryParams = {
    limit: 100,
  };

  if (cursor) {
    requestObject.cursor = cursor;
  }

  const response = await agent.app.bsky.graph.getBlocks(requestObject);

  if (response.data) {
    return response.data;
  }

  return null;
};

export const getAccounts = async (searchTerm: string, cursor: string | null) => {
  const requestObject: AppBskyActorSearchActors.QueryParams = {
    limit: 100,
    term: searchTerm,
  };

  if (cursor) {
    requestObject.cursor = cursor;
  }

  const response = await agent.searchActors(requestObject);

  if (response.data) {
    return response.data;
  }

  return null;
};

export const getExistingCredentialsHash = async () => {
  const credentialsHash = await getItemFromLocalStore<CredentialsHashStore>(ATPCredentialsHashKey);
  if (!credentialsHash) {
    return null;
  }

  return credentialsHash.key;
};
export const credentialsUpdatedByAccount = async () => {
  const { accountId, password, service } = getPreferences();
  const credentialsHashKey = createHashKey(`${accountId}:${password}:${service}`);

  const existingCredentialsHash = await getExistingCredentialsHash();

  return credentialsHashKey !== existingCredentialsHash;
};

export const startNewSession = async (): Promise<ATSessionResponse> => {
  await clearLocalStore();
  await clearCache();

  const result = await createNewSession();

  return result;
};

export const startATSession = async (): Promise<ATSessionResponse> => {
  if (await credentialsUpdatedByAccount()) {
    return startNewSession();
  }

  const existingSession = await getExistingSession();

  if (existingSession) {
    agent.resumeSession(existingSession);

    const response: ATSessionResponse = {
      status: "resuming-existing-session",
    };

    return response;
  }

  return startNewSession();
};
