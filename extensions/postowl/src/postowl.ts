import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { extensionPreferences } from "./preferences";
import { CreatePostValues, ExistingPost, ExistingPostResponse, PostGenerateResponse } from "./types";
import { splitContentIntoTweetSizedChunks } from "./utils";

export function useScheduledPosts() {
  const { data, ...rest } = useFetch<ExistingPostResponse>(
    "https://api.postowl.io/api/collections/pbc_3857744388/records?page=1&perPage=40&sort=-%40rowid&skipTotal=1&filter=status%20%3D%20%22pending%22",
    {
      method: "GET",
      headers: {
        Authorization: `${extensionPreferences.token}`,
        accept: "application/json",
      },
    }
  );

  return {
    data: data?.items,
    ...rest,
  };
}

export function usePublishedPosts() {
  const { data, ...rest } = useFetch<ExistingPostResponse>(
    "https://api.postowl.io/api/collections/pbc_3857744388/records?page=1&perPage=40&sort=-%40rowid&skipTotal=1&filter=status%20%3D%20%22posted%22",
    {
      method: "GET",
      headers: {
        Authorization: `${extensionPreferences.token}`,
        accept: "application/json",
      },
    }
  );

  return {
    data: data?.items,
    ...rest,
  };
}

export async function getCurrentUser() {
  const response = await fetch("https://api.postowl.io/api/collections/_pb_users_auth_/records", {
    method: "GET",
    headers: {
      Authorization: `${extensionPreferences.token}`,
    },
  });
  const records = (await response.json()) as { items: any[] };

  if (records.items && records.items.length === 0) {
    throw new Error("No user found");
  }

  return records.items[0];
}

export async function getAccounts() {
  const response = await fetch("https://api.postowl.io/api/collections/twitter_accounts/records", {
    method: "GET",
    headers: {
      Authorization: `${extensionPreferences.token}`,
    },
  });
  const records = (await response.json()) as { items: any[] };

  if (records.items && records.items.length === 0) {
    throw new Error("No accounts found");
  }

  return records.items;
}

export async function getPostModels() {
  const response = await fetch(
    "https://api.postowl.io/api/collections/pbc_3552922951/records?page=1&perPage=40&sort=-%40rowid&skipTotal=1&filter=type%20%3D%20%22post%22%20%26%26%20status%20!%3D%20%22draft%22",
    {
      method: "GET",
      headers: {
        Authorization: `${extensionPreferences.token}`,
      },
    }
  );
  const records = (await response.json()) as { items: any[] };

  if (records.items && records.items.length === 0) {
    throw new Error("No post models found");
  }

  return records.items;
}

export async function getReplyModels() {
  const response = await fetch(
    "https://api.postowl.io/api/collections/pbc_3552922951/records?page=1&perPage=40&sort=-%40rowid&skipTotal=1&filter=type%20%3D%20%22reply%22%20%26%26%20status%20!%3D%20%22draft%22",
    {
      method: "GET",
      headers: {
        Authorization: `${extensionPreferences.token}`,
      },
    }
  );
  const records = (await response.json()) as { items: any[] };

  if (records.items && records.items.length === 0) {
    throw new Error("No reply models found");
  }

  return records.items;
}

export async function generatePost(message: string, userId: string, modelId: string) {
  //message, userId, modelId
  const response = await fetch("https://postowl.io/api/models/create-post", {
    method: "POST",
    headers: {
      Authorization: `${extensionPreferences.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: message, userId: userId, modelId: modelId }),
  });

  const data = (await response.json()) as any;
  if (data.error) {
    throw new Error(data.error);
  }
  return data as PostGenerateResponse;
}

export async function createDraft(values: CreatePostValues, userId: string, splitContent: boolean) {
  const formattedPost = {
    userId: userId,
    posts: splitContent
      ? splitContentIntoTweetSizedChunks(values.posts)
      : [
          {
            id: Math.random().toString(36).substring(2, 15),
            content: values.posts,
          },
        ],
    accountId: values.accountId,
    scheduled_for: values.scheduled_for ? values.scheduled_for.toISOString() : undefined,
  };

  const response = await fetch("https://postowl.io/api/twitter/posts", {
    method: "POST",
    headers: {
      Authorization: `${extensionPreferences.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formattedPost),
  });

  const data = (await response.json()) as any;
  if (data.error) {
    throw new Error(data.error);
  }
  return data as ExistingPost;
}
