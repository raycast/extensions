import { getPreferenceValues } from "@raycast/api";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { FlickrAuth, FlickrGroup, FlickrPhotoset, FlickrPublishingContext } from "./types";

const OAUTH_REQUEST_TOKEN_URL = "https://www.flickr.com/services/oauth/request_token";
const OAUTH_AUTHORIZE_URL = "https://www.flickr.com/services/oauth/authorize";
const OAUTH_ACCESS_TOKEN_URL = "https://www.flickr.com/services/oauth/access_token";
const REST_URL = "https://www.flickr.com/services/rest";
const UPLOAD_URL = "https://up.flickr.com/services/upload/";

type RequestTokenResponse = {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed?: string;
};

type AccessTokenResponse = RequestTokenResponse & {
  user_nsid: string;
  username: string;
  fullname?: string;
};

type FlickrOkResponse<T> = T & {
  stat: "ok";
};

type FlickrErrorResponse = {
  stat: "fail";
  code: number;
  message: string;
};

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildSignatureBaseString(method: "GET" | "POST", url: string, params: Record<string, string>) {
  const normalizedParams = Object.entries(params)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }
      return leftKey.localeCompare(rightKey);
    })
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join("&");

  return [method, percentEncode(url), percentEncode(normalizedParams)].join("&");
}

async function hmacSha1(text: string, key: string) {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha1", key).update(text).digest("base64");
}

async function buildOAuthParams(
  method: "GET" | "POST",
  url: string,
  extraParams: Record<string, string>,
  token?: { value: string; secret: string },
) {
  const { randomBytes } = await import("node:crypto");
  const preferences = getPreferenceValues<Preferences>();
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: preferences.flickrApiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };

  if (token) {
    oauthParams.oauth_token = token.value;
  }

  const baseString = buildSignatureBaseString(method, url, { ...oauthParams, ...extraParams });
  const signingKey = `${percentEncode(preferences.flickrApiSecret)}&${percentEncode(token?.secret ?? "")}`;
  const oauth_signature = await hmacSha1(baseString, signingKey);

  return { ...oauthParams, oauth_signature };
}

function toSearchParams(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }
  return searchParams;
}

function parseOAuthResponse(responseText: string) {
  const parsed = new URLSearchParams(responseText);
  return Object.fromEntries(parsed.entries()) as Record<string, string>;
}
function formatUploadDebugResponse(responseText: string) {
  return responseText.replace(/\s+/g, " ").trim().slice(0, 1200);
}

function parseUploadResponse(responseText: string) {
  const debugResponse = formatUploadDebugResponse(responseText);
  const errorMatch = responseText.match(/<err\b[^>]*code="([^"]+)"[^>]*msg="([^"]+)"[^>]*\/?>/i);
  if (errorMatch) {
    throw new Error(`Flickr upload failed (${errorMatch[1]}): ${errorMatch[2]}. Response: ${debugResponse}`);
  }

  const photoIdMatch = responseText.match(/<photoid\b[^>]*>\s*([^<\s]+)\s*<\/photoid>/i);
  if (photoIdMatch?.[1]) {
    return photoIdMatch[1];
  }

  const ticketIdMatch = responseText.match(/<ticketid\b[^>]*>\s*([^<\s]+)\s*<\/ticketid>/i);
  if (ticketIdMatch?.[1]) {
    throw new Error(
      `Flickr returned an asynchronous upload ticket (${ticketIdMatch[1]}) instead of a photo id. Response: ${debugResponse}`,
    );
  }

  throw new Error(`Flickr upload succeeded but returned an unexpected response: ${debugResponse}`);
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `${response.status} ${response.statusText}`);
  }
  return text;
}

async function flickrRest<T>(
  methodName: string,
  auth: FlickrAuth,
  extraParams: Record<string, string> = {},
  httpMethod: "GET" | "POST" = "POST",
) {
  const signedParams = await buildOAuthParams(
    httpMethod,
    REST_URL,
    {
      format: "json",
      method: methodName,
      nojsoncallback: "1",
      ...extraParams,
    },
    {
      value: auth.accessToken,
      secret: auth.accessTokenSecret,
    },
  );

  const params = {
    format: "json",
    method: methodName,
    nojsoncallback: "1",
    ...extraParams,
    ...signedParams,
  };

  const url = httpMethod === "GET" ? `${REST_URL}?${toSearchParams(params).toString()}` : REST_URL;

  const response = await fetch(url, {
    method: httpMethod,
    headers: httpMethod === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: httpMethod === "POST" ? toSearchParams(params).toString() : undefined,
  });

  const payload = (await response.json()) as FlickrOkResponse<T> | FlickrErrorResponse;

  if (!response.ok) {
    throw new Error(`Flickr API error: ${response.status} ${response.statusText}`);
  }

  if (payload.stat === "fail") {
    throw new Error(`Flickr API error ${payload.code}: ${payload.message}`);
  }

  return payload;
}

export function getAuthorizeUrl(requestToken: string) {
  const url = new URL(OAUTH_AUTHORIZE_URL);
  url.searchParams.set("oauth_token", requestToken);
  url.searchParams.set("perms", "write");
  return url.toString();
}

export async function beginOAuthLogin() {
  const oauthParams = await buildOAuthParams("GET", OAUTH_REQUEST_TOKEN_URL, { oauth_callback: "oob" });
  const url = new URL(OAUTH_REQUEST_TOKEN_URL);

  for (const [key, value] of Object.entries({ ...oauthParams, oauth_callback: "oob" })) {
    url.searchParams.set(key, value);
  }

  const responseText = await fetchText(url.toString());
  const data = parseOAuthResponse(responseText) as RequestTokenResponse;

  if (!data.oauth_token || !data.oauth_token_secret) {
    throw new Error("Flickr did not return a valid request token.");
  }

  return {
    requestToken: data.oauth_token,
    requestTokenSecret: data.oauth_token_secret,
    authorizeUrl: getAuthorizeUrl(data.oauth_token),
  };
}

export async function completeOAuthLogin(requestToken: string, requestTokenSecret: string, verifier: string) {
  const oauthParams = await buildOAuthParams(
    "GET",
    OAUTH_ACCESS_TOKEN_URL,
    {
      oauth_verifier: verifier,
    },
    {
      value: requestToken,
      secret: requestTokenSecret,
    },
  );

  const url = new URL(OAUTH_ACCESS_TOKEN_URL);
  for (const [key, value] of Object.entries({ ...oauthParams, oauth_verifier: verifier })) {
    url.searchParams.set(key, value);
  }
  const responseText = await fetchText(url.toString());
  const data = parseOAuthResponse(responseText) as AccessTokenResponse;

  if (!data.oauth_token || !data.oauth_token_secret || !data.user_nsid || !data.username) {
    throw new Error("Flickr did not return a valid access token.");
  }

  return {
    accessToken: data.oauth_token,
    accessTokenSecret: data.oauth_token_secret,
    userNsid: data.user_nsid,
    username: data.username,
    fullName: data.fullname,
  } satisfies FlickrAuth;
}

export async function getPublishingContext(auth: FlickrAuth): Promise<FlickrPublishingContext> {
  const [photosetsResponse, groupsResponse] = await Promise.all([
    flickrRest<{
      photosets: {
        photoset: Array<{
          id: string;
          title: { _content: string } | string;
          description?: { _content: string } | string;
        }>;
      };
    }>("flickr.photosets.getList", auth),
    flickrRest<{
      groups: {
        group: Array<{
          nsid: string;
          name: string;
          privacy?: string;
        }>;
      };
    }>("flickr.groups.pools.getGroups", auth),
  ]);

  const photosets: FlickrPhotoset[] = (photosetsResponse.photosets?.photoset ?? []).map((photoset) => ({
    id: photoset.id,
    title: typeof photoset.title === "string" ? photoset.title : photoset.title._content,
    description:
      typeof photoset.description === "string"
        ? photoset.description
        : photoset.description?._content,
  }));

  const groups: FlickrGroup[] = (groupsResponse.groups?.group ?? []).map((group) => ({
    id: group.nsid,
    name: group.name,
    privacy: group.privacy,
  }));

  return { photosets, groups };
}

function buildVisibilityParams(visibility: string) {
  switch (visibility) {
    case "public":
      return { is_public: "1", is_friend: "0", is_family: "0" };
    case "friends":
      return { is_public: "0", is_friend: "1", is_family: "0" };
    case "family":
      return { is_public: "0", is_friend: "0", is_family: "1" };
    case "friends_family":
      return { is_public: "0", is_friend: "1", is_family: "1" };
    case "private":
    default:
      return { is_public: "0", is_friend: "0", is_family: "0" };
  }
}

export function normalizeTags(tagsInput: string) {
  return tagsInput
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.includes(" ") ? `"${tag}"` : tag))
    .join(" ");
}

export async function uploadPhoto(
  auth: FlickrAuth,
  options: {
    filePath: string;
    title: string;
    description: string;
    tags: string;
    visibility: string;
  },
) {
  const visibilityParams = buildVisibilityParams(options.visibility);
  const rawUploadParams: Record<string, string> = {
    title: options.title,
    description: options.description,
    tags: options.tags,
    ...visibilityParams,
  };
  const uploadParams = Object.fromEntries(
    Object.entries(rawUploadParams).filter(([, value]) => value !== ""),
  ) as Record<string, string>;

  const oauthParams = await buildOAuthParams(
    "POST",
    UPLOAD_URL,
    uploadParams,
    { value: auth.accessToken, secret: auth.accessTokenSecret },
  );

  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...uploadParams, ...oauthParams })) {
    formData.set(key, value);
  }

  const extension = path.extname(options.filePath).replace(/^\./, "").toLowerCase();
  const mimeType =
    extension === "jpg" || extension === "jpeg"
      ? "image/jpeg"
      : extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : extension === "gif"
            ? "image/gif"
            : "application/octet-stream";
  const fileBuffer = await readFile(options.filePath);
  formData.set("photo", new Blob([fileBuffer], { type: mimeType }), path.basename(options.filePath));
  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Flickr upload request failed: ${response.status} ${response.statusText}. Response: ${formatUploadDebugResponse(responseText)}`,
    );
  }
  return parseUploadResponse(responseText);
}


export async function addPhotoToPhotoset(auth: FlickrAuth, photosetId: string, photoId: string) {
  await flickrRest("flickr.photosets.addPhoto", auth, {
    photoset_id: photosetId,
    photo_id: photoId,
  });
}

export async function createPhotoset(auth: FlickrAuth, title: string, primaryPhotoId: string) {
  const response = await flickrRest<{
    photoset: {
      id: string;
    };
  }>("flickr.photosets.create", auth, {
    title,
    primary_photo_id: primaryPhotoId,
  });

  return response.photoset.id;
}

export async function addPhotoToGroup(auth: FlickrAuth, groupId: string, photoId: string) {
  await flickrRest("flickr.groups.pools.add", auth, {
    group_id: groupId,
    photo_id: photoId,
  });
}

export async function verifyAuth(auth: FlickrAuth) {
  return flickrRest<{
    user: {
      id: string;
      username: {
        _content: string;
      };
    };
  }>("flickr.test.login", auth);
}
