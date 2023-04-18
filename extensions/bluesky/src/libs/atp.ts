import {
  ATPCredentialsHashKey,
  ATPSessionStorageKey,
  BlueskyFeedType,
  BlueskyProfileUrlBase,
  BlueskyQuoteType,
  FirstSignInSuccessToast,
  ProfileCacheKey,
} from "../utils/constants";
import { ATSessionResponse, CredentialsHashStore, PostReference } from "../types/types";
import {
  AppBskyActorSearchActors,
  AppBskyFeedGetAuthorFeed,
  AppBskyFeedGetTimeline,
  AppBskyFeedPost,
  AppBskyNotificationListNotifications,
  AtpSessionData,
  BskyAgent,
  RichText,
} from "@atproto/api";
import { Cache, LocalStorage } from "@raycast/api";
import { clearLocalStore, getItemFromLocalStore } from "../utils/localStore";
import { createHashKey, showSuccessToast } from "../utils/common";

import { AtUri } from "@atproto/uri";
import { clearCache } from "../utils/cacheStore";
import fetch from "cross-fetch";
import { getPreferences } from "../utils/preference";

global.fetch = fetch;

const agent = new BskyAgent({
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

export const getSignedInUserHandle = async () => {
  const session = await getExistingSession();
  return session?.handle;
};

export const getExistingSession = async () => {
  return await getItemFromLocalStore<AtpSessionData>(ATPSessionStorageKey);
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
  } else {
    return null;
  }
};

export const getUserPosts = async (handle: string, cursor: string | null, limit = 10) => {
  const requestObject: AppBskyFeedGetAuthorFeed.QueryParams = {
    actor: handle,
    limit,
  };
  if (cursor) {
    requestObject.cursor = cursor;
  }

  const response = await agent.getAuthorFeed(requestObject);

  if (response.data) {
    return response.data;
  } else {
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
  } else {
    return null;
  }
};

export const getRKey = (uri: string) => {
  return new AtUri(uri).rkey;
};

export const createPost = async (postText: string, postReference?: PostReference) => {
  const rt = new RichText({ text: postText });
  await rt.detectFacets(agent);

  const postRecord: Partial<AppBskyFeedPost.Record> & Omit<AppBskyFeedPost.Record, "createdAt"> = {
    $type: { BskyFeedType: BlueskyFeedType },
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

export const createNewSession = async (): Promise<ATSessionResponse> => {
  try {
    const { accountId, password, service } = getPreferences();
    const identifier = accountId.startsWith("@") ? accountId.slice(1) : accountId;

    await agent.login({ identifier, password });

    const hashStore: CredentialsHashStore = {
      key: createHashKey(`${accountId}:${password}:${service}`),
    };

    await LocalStorage.setItem(ATPCredentialsHashKey, JSON.stringify(hashStore));
    showSuccessToast(FirstSignInSuccessToast);

    const session = await getExistingSession();

    if (session) {
      const cache = new Cache();
      const profile = await getProfile(session?.handle);
      cache.set(ProfileCacheKey, JSON.stringify(profile));
    }

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

export const getUsers = async (searchTerm: string, cursor: string | null) => {
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
export const credentialsUpdatedByUser = async () => {
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
  if (await credentialsUpdatedByUser()) {
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
