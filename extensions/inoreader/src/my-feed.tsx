import {
  Action,
  ActionPanel,
  Detail,
  Image,
  Icon,
  List,
  LocalStorage,
  OAuth,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = "https://www.inoreader.com/reader/api/0";
const AUTHORIZE_ENDPOINT = "https://www.inoreader.com/oauth2/auth";
const TOKEN_ENDPOINT = "https://www.inoreader.com/oauth2/token";
const REDIRECT_URI = "https://raycast.com/redirect/extension";

const ALL_FOLLOWED_STREAM_ID = "user/-/state/com.google/reading-list";
const READ_TAG_ID = "user/-/state/com.google/read";
const SAVED_TAG_ID = "user/-/state/com.google/starred";
const SUBSCRIPTION_CACHE_KEY = "inoreader-subscriptions-cache-v1";
const VIP_SOURCE_IDS_STORAGE_KEY = "inoreader-vip-source-ids-v1";
const SUBSCRIPTION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const INITIAL_STREAM_LOAD_DEBOUNCE_MS = 150;
const execFileAsync = promisify(execFile);

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Inoreader",
  providerIcon: Icon.Rss,
  description: "Connect your Inoreader account to read and manage followed feeds.",
});

type InoreaderCategory = {
  id: string;
  label?: string;
};

type InoreaderSubscription = {
  id: string;
  title: string;
  iconUrl?: string;
  categories?: InoreaderCategory[];
};

type SubscriptionListResponse = {
  subscriptions?: InoreaderSubscription[];
};

type SubscriptionCacheEntry = {
  updatedAt: number;
  subscriptions: InoreaderSubscription[];
};

type VipSourceIdsStorage = {
  sourceIds: string[];
};

type FeedViewProps = {
  defaultStreamId?: string;
  defaultStreamTitle?: string;
  enableStreamSelection?: boolean;
};

type InoreaderArticle = {
  id: string;
  title?: string;
  canonical?: Array<{ href?: string }>;
  alternate?: Array<{ href?: string }>;
  origin?: {
    streamId?: string;
    title?: string;
    htmlUrl?: string;
  };
  summary?: {
    content?: string;
  };
  published?: number;
  updated?: number;
};

type StreamContentsResponse = {
  items?: InoreaderArticle[];
  continuation?: string;
};

type OAuthTokenResponse = OAuth.TokenResponse & {
  access_token: string;
  refresh_token?: string;
};

class InoreaderApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Inoreader API request failed with status ${status}`);
    this.name = "InoreaderApiError";
  }
}

function getScope(preferences: Preferences.MyFeed): string {
  return preferences.scope?.trim() ? preferences.scope.trim() : "read write";
}

function isUnauthorized(error: unknown): error is InoreaderApiError {
  return error instanceof InoreaderApiError && error.status === 401;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof InoreaderApiError) {
    const message = error.body.match(/^Error=(.+)$/m)?.[1]?.trim();
    if (message) {
      return message;
    }
    if (error.body.trim()) {
      return `HTTP ${error.status}: ${error.body.trim()}`;
    }
    return `HTTP ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function isInvalidClientTokenError(status: number, body: string): boolean {
  const text = body.toLowerCase();
  return (status === 400 || status === 401) && (text.includes("invalid_client") || text.includes("client secret"));
}

async function fetchTokens(
  params: URLSearchParams,
  preferences: Preferences.MyFeed,
  previousRefreshToken?: string,
): Promise<OAuthTokenResponse> {
  const clientId = preferences.clientId.trim();
  const clientSecret = preferences.clientSecret?.trim();
  const modes = clientSecret
    ? [
        { useBasicAuth: true, includeClientSecretInBody: false },
        { useBasicAuth: false, includeClientSecretInBody: true },
      ]
    : [{ useBasicAuth: false, includeClientSecretInBody: false }];

  let lastError: InoreaderApiError | undefined;

  for (const mode of modes) {
    const body = new URLSearchParams(params);
    if (!body.get("client_id")) {
      body.set("client_id", clientId);
    }
    if (mode.includeClientSecretInBody && clientSecret) {
      body.set("client_secret", clientSecret);
    } else {
      body.delete("client_secret");
    }

    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    if (mode.useBasicAuth && clientSecret) {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      headers.Authorization = `Basic ${basic}`;
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers,
      body,
    });

    const responseText = await response.text();
    if (response.ok) {
      const tokenResponse = JSON.parse(responseText) as OAuthTokenResponse;
      if (!tokenResponse.refresh_token && previousRefreshToken) {
        tokenResponse.refresh_token = previousRefreshToken;
      }
      return tokenResponse;
    }

    lastError = new InoreaderApiError(response.status, responseText);
    if (!isInvalidClientTokenError(response.status, responseText)) {
      break;
    }
  }

  throw lastError ?? new InoreaderApiError(500, "Unknown token exchange failure");
}

async function authorizeAndGetToken(preferences: Preferences.MyFeed): Promise<string> {
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: AUTHORIZE_ENDPOINT,
    clientId: preferences.clientId.trim(),
    scope: getScope(preferences),
    extraParameters: { redirect_uri: REDIRECT_URI },
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const params = new URLSearchParams();
  params.set("code", authorizationCode);
  params.set("redirect_uri", REDIRECT_URI);
  params.set("client_id", preferences.clientId.trim());
  params.set("grant_type", "authorization_code");
  params.set("code_verifier", authRequest.codeVerifier);

  const tokenResponse = await fetchTokens(params, preferences);
  await oauthClient.setTokens(tokenResponse);
  return tokenResponse.access_token;
}

async function getAccessToken(preferences: Preferences.MyFeed, interactive: boolean): Promise<string | undefined> {
  const tokens = await oauthClient.getTokens();
  if (tokens?.accessToken) {
    return tokens.accessToken;
  }

  if (!interactive) {
    return undefined;
  }

  return authorizeAndGetToken(preferences);
}

async function requestJson<T>(token: string, path: string, params?: URLSearchParams): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    url.search = params.toString();
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new InoreaderApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}

async function postForm(token: string, path: string, body: URLSearchParams): Promise<string> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new InoreaderApiError(response.status, text);
  }
  return text;
}

function getArticleUrl(article: InoreaderArticle): string | undefined {
  return article.canonical?.[0]?.href || article.alternate?.[0]?.href || article.origin?.htmlUrl;
}

async function openUrlInBackground(url: string): Promise<void> {
  await execFileAsync("open", ["-g", url]);
}

function getArticleDate(article: InoreaderArticle): Date | undefined {
  const value = article.published ?? article.updated;
  if (!value || Number.isNaN(value)) {
    return undefined;
  }

  const timestampMs = value > 9_999_999_999 ? value : value * 1000;
  const date = new Date(timestampMs);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeIconUrl(url?: string): string | undefined {
  const value = url?.trim();
  if (!value) {
    return undefined;
  }
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  if (value.startsWith("/")) {
    return `https://www.inoreader.com${value}`;
  }
  return value;
}

function getItemIcon(article: InoreaderArticle, subscriptionIcon?: string): Image.ImageLike {
  const faviconTarget = article.origin?.htmlUrl ?? getArticleUrl(article);
  if (faviconTarget) {
    return getFavicon(faviconTarget, {
      fallback: subscriptionIcon || Icon.Rss,
      mask: Image.Mask.RoundedRectangle,
    });
  }

  if (!subscriptionIcon) {
    return Icon.Rss;
  }

  return {
    source: subscriptionIcon,
    fallback: Icon.Rss,
    mask: Image.Mask.RoundedRectangle,
  };
}

const NAMED_HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  hellip: "...",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  ndash: "-",
  mdash: "-",
  bull: "•",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  atilde: "ã",
  auml: "ä",
  aring: "å",
  aelig: "æ",
  ccedil: "ç",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  igrave: "ì",
  iacute: "í",
  icirc: "î",
  iuml: "ï",
  ntilde: "ñ",
  ograve: "ò",
  oacute: "ó",
  ocirc: "ô",
  otilde: "õ",
  ouml: "ö",
  oslash: "ø",
  ugrave: "ù",
  uacute: "ú",
  ucirc: "û",
  uuml: "ü",
  yacute: "ý",
  yuml: "ÿ",
  Agrave: "À",
  Aacute: "Á",
  Acirc: "Â",
  Atilde: "Ã",
  Auml: "Ä",
  Aring: "Å",
  AElig: "Æ",
  Ccedil: "Ç",
  Egrave: "È",
  Eacute: "É",
  Ecirc: "Ê",
  Euml: "Ë",
  Igrave: "Ì",
  Iacute: "Í",
  Icirc: "Î",
  Iuml: "Ï",
  Ntilde: "Ñ",
  Ograve: "Ò",
  Oacute: "Ó",
  Ocirc: "Ô",
  Otilde: "Õ",
  Ouml: "Ö",
  Oslash: "Ø",
  Ugrave: "Ù",
  Uacute: "Ú",
  Ucirc: "Û",
  Uuml: "Ü",
  Yacute: "Ý",
};

function decodeHtmlEntities(input?: string): string {
  if (!input) {
    return "";
  }

  return input
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (entity, name) => NAMED_HTML_ENTITY_MAP[name] ?? entity);
}

function parseVipSourceIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(raw) as VipSourceIdsStorage;
    if (!Array.isArray(parsed?.sourceIds)) {
      return new Set();
    }
    const ids = parsed.sourceIds.map((id) => id.trim()).filter(Boolean);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function FeedView({
  defaultStreamId = ALL_FOLLOWED_STREAM_ID,
  defaultStreamTitle = "All Followed Feeds",
  enableStreamSelection = true,
}: FeedViewProps) {
  const rawPreferences = getPreferenceValues<Preferences.MyFeed>();
  const preferences = useMemo(
    () => ({
      clientId: rawPreferences.clientId,
      clientSecret: rawPreferences.clientSecret,
      scope: rawPreferences.scope,
      unreadOnly: rawPreferences.unreadOnly,
      itemsPerPage: rawPreferences.itemsPerPage,
      showSiteName: rawPreferences.showSiteName,
    }),
    [
      rawPreferences.clientId,
      rawPreferences.clientSecret,
      rawPreferences.scope,
      rawPreferences.unreadOnly,
      rawPreferences.itemsPerPage,
      rawPreferences.showSiteName,
    ],
  );
  const pageSize = useMemo(() => {
    const parsed = Number.parseInt(preferences.itemsPerPage, 10);
    if (Number.isNaN(parsed)) {
      return 50;
    }
    return Math.max(1, Math.min(100, parsed));
  }, [preferences.itemsPerPage]);

  const [token, setToken] = useState<string | undefined>(undefined);
  const [authError, setAuthError] = useState<string | undefined>(undefined);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasCheckedStoredToken, setHasCheckedStoredToken] = useState(false);

  const [subscriptions, setSubscriptions] = useState<InoreaderSubscription[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string>(defaultStreamId);
  const [vipSourceIds, setVipSourceIds] = useState<Set<string>>(new Set());
  const [hasLoadedVipSourceIds, setHasLoadedVipSourceIds] = useState(false);

  const [items, setItems] = useState<InoreaderArticle[]>([]);
  const [continuation, setContinuation] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const requestVersionRef = useRef(0);
  const continuationRef = useRef<string | undefined>(undefined);
  const hasAttemptedAutoConnectRef = useRef(false);
  const loadItemsDebounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleUnauthorized = useCallback(async () => {
    setToken(undefined);
    setAuthError("Your Inoreader session expired. Reconnect to continue.");
    await oauthClient.removeTokens();
  }, []);

  const persistVipSourceIds = useCallback(async (nextVipSourceIds: Set<string>) => {
    const payload: VipSourceIdsStorage = {
      sourceIds: [...nextVipSourceIds].sort(),
    };
    await LocalStorage.setItem(VIP_SOURCE_IDS_STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const addSourceToVip = useCallback(
    async (streamId: string, sourceTitle?: string) => {
      if (!streamId || vipSourceIds.has(streamId)) {
        return;
      }

      const nextVipSourceIds = new Set(vipSourceIds);
      nextVipSourceIds.add(streamId);
      setVipSourceIds(nextVipSourceIds);

      try {
        await persistVipSourceIds(nextVipSourceIds);
        await showToast({
          style: Toast.Style.Success,
          title: "Source added as VIP",
          message: sourceTitle || "Source",
        });
      } catch (error) {
        setVipSourceIds(vipSourceIds);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to save VIP source",
          message: normalizeErrorMessage(error),
        });
      }
    },
    [persistVipSourceIds, vipSourceIds],
  );

  const removeSourceFromVip = useCallback(
    async (streamId: string, sourceTitle?: string) => {
      if (!streamId || !vipSourceIds.has(streamId)) {
        return;
      }

      const nextVipSourceIds = new Set(vipSourceIds);
      nextVipSourceIds.delete(streamId);
      setVipSourceIds(nextVipSourceIds);

      try {
        await persistVipSourceIds(nextVipSourceIds);
        await showToast({
          style: Toast.Style.Success,
          title: "Source removed from VIP",
          message: sourceTitle || "Source",
        });
      } catch (error) {
        setVipSourceIds(vipSourceIds);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to update VIP sources",
          message: normalizeErrorMessage(error),
        });
      }
    },
    [persistVipSourceIds, vipSourceIds],
  );

  const connect = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(undefined);
    try {
      const nextToken = await getAccessToken(preferences, true);
      if (!nextToken) {
        throw new Error("Authentication did not return an access token.");
      }
      setToken(nextToken);
      setAuthError(undefined);
      await showToast({ style: Toast.Style.Success, title: "Connected to Inoreader" });
    } catch (error) {
      setAuthError(normalizeErrorMessage(error));
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to connect to Inoreader",
        message: normalizeErrorMessage(error),
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, [preferences]);

  const loadSubscriptions = useCallback(
    async (options?: { force?: boolean }) => {
      if (!token) {
        return;
      }

      try {
        if (!options?.force) {
          const cachedValue = await LocalStorage.getItem<string>(SUBSCRIPTION_CACHE_KEY);
          if (cachedValue) {
            try {
              const parsed = JSON.parse(cachedValue) as SubscriptionCacheEntry;
              if (
                parsed?.updatedAt &&
                Array.isArray(parsed.subscriptions) &&
                Date.now() - parsed.updatedAt < SUBSCRIPTION_CACHE_TTL_MS
              ) {
                setSubscriptions(parsed.subscriptions);
                return;
              }
            } catch {
              // Ignore malformed cache and fetch a fresh value.
            }
          }
        }

        const response = await requestJson<SubscriptionListResponse>(token, "/subscription/list");
        const nextSubscriptions = [...(response.subscriptions ?? [])].sort((a, b) => a.title.localeCompare(b.title));
        setSubscriptions(nextSubscriptions);
        const cacheEntry: SubscriptionCacheEntry = {
          updatedAt: Date.now(),
          subscriptions: nextSubscriptions,
        };
        await LocalStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(cacheEntry));
      } catch (error) {
        if (isUnauthorized(error)) {
          await handleUnauthorized();
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to load followed feeds",
          message: normalizeErrorMessage(error),
        });
      }
    },
    [handleUnauthorized, token],
  );

  const loadItems = useCallback(
    async (reset: boolean) => {
      if (!token) {
        return;
      }

      const requestVersion = ++requestVersionRef.current;
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("n", String(pageSize));
        if (preferences.unreadOnly) {
          params.set("xt", READ_TAG_ID);
        }
        if (!reset && continuationRef.current) {
          params.set("c", continuationRef.current);
        }

        const encodedStreamId = encodeURIComponent(selectedStreamId);
        const response = await requestJson<StreamContentsResponse>(
          token,
          `/stream/contents/${encodedStreamId}`,
          params,
        );
        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        const nextItems = response.items ?? [];
        setItems((current) => {
          if (reset) {
            return nextItems;
          }
          const known = new Set(current.map((item) => item.id));
          const unique = nextItems.filter((item) => !known.has(item.id));
          return [...current, ...unique];
        });
        continuationRef.current = response.continuation;
        setContinuation(response.continuation);
      } catch (error) {
        if (isUnauthorized(error)) {
          await handleUnauthorized();
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to load articles",
          message: normalizeErrorMessage(error),
        });
      } finally {
        if (requestVersion === requestVersionRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [handleUnauthorized, pageSize, preferences.unreadOnly, selectedStreamId, token],
  );

  const markItemAsRead = useCallback(
    async (item: InoreaderArticle) => {
      if (!token) {
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Marking article as read...",
      });

      try {
        const form = new URLSearchParams();
        form.set("i", item.id);
        form.set("a", READ_TAG_ID);
        await postForm(token, "/edit-tag", form);

        if (preferences.unreadOnly) {
          setItems((current) => current.filter((entry) => entry.id !== item.id));
        }
        toast.style = Toast.Style.Success;
        toast.title = "Marked as read";
      } catch (error) {
        if (isUnauthorized(error)) {
          await handleUnauthorized();
        }
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to mark as read";
        toast.message = normalizeErrorMessage(error);
      }
    },
    [handleUnauthorized, preferences.unreadOnly, token],
  );

  const saveItem = useCallback(
    async (item: InoreaderArticle) => {
      if (!token) {
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving article...",
      });

      try {
        const form = new URLSearchParams();
        form.set("i", item.id);
        form.set("a", SAVED_TAG_ID);
        await postForm(token, "/edit-tag", form);

        toast.style = Toast.Style.Success;
        toast.title = "Article saved";
      } catch (error) {
        if (isUnauthorized(error)) {
          await handleUnauthorized();
        }
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to save article";
        toast.message = normalizeErrorMessage(error);
      }
    },
    [handleUnauthorized, token],
  );

  const markCurrentStreamAsRead = useCallback(async () => {
    if (!token) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Marking stream as read...",
    });

    try {
      const form = new URLSearchParams();
      form.set("s", selectedStreamId);
      form.set("ts", String(Math.floor(Date.now() / 1000)));
      await postForm(token, "/mark-all-as-read", form);

      setItems([]);
      continuationRef.current = undefined;
      setContinuation(undefined);
      toast.style = Toast.Style.Success;
      toast.title = "Stream marked as read";
    } catch (error) {
      if (isUnauthorized(error)) {
        await handleUnauthorized();
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to mark stream as read";
      toast.message = normalizeErrorMessage(error);
    }
  }, [handleUnauthorized, selectedStreamId, token]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      setIsAuthenticating(true);
      try {
        const existingToken = await getAccessToken(preferences, false);
        if (isMounted && existingToken) {
          setToken(existingToken);
          setAuthError(undefined);
        }
      } catch (error) {
        if (isMounted) {
          setAuthError(normalizeErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsAuthenticating(false);
          setHasCheckedStoredToken(true);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [preferences]);

  useEffect(() => {
    if (!hasCheckedStoredToken || token || isAuthenticating || authError || hasAttemptedAutoConnectRef.current) {
      return;
    }
    hasAttemptedAutoConnectRef.current = true;
    void connect();
  }, [authError, connect, hasCheckedStoredToken, isAuthenticating, token]);

  useEffect(() => {
    let isMounted = true;

    async function loadVipSources() {
      try {
        const raw = await LocalStorage.getItem<string>(VIP_SOURCE_IDS_STORAGE_KEY);
        if (isMounted) {
          setVipSourceIds(parseVipSourceIds(raw));
        }
      } catch {
        if (isMounted) {
          setVipSourceIds(new Set());
        }
      } finally {
        if (isMounted) {
          setHasLoadedVipSourceIds(true);
        }
      }
    }

    void loadVipSources();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedStreamId(defaultStreamId);
  }, [defaultStreamId]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadSubscriptions();
  }, [loadSubscriptions, token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    setItems([]);
    continuationRef.current = undefined;
    setContinuation(undefined);
    if (loadItemsDebounceTimerRef.current) {
      clearTimeout(loadItemsDebounceTimerRef.current);
    }
    loadItemsDebounceTimerRef.current = setTimeout(() => {
      void loadItems(true);
    }, INITIAL_STREAM_LOAD_DEBOUNCE_MS);

    return () => {
      if (loadItemsDebounceTimerRef.current) {
        clearTimeout(loadItemsDebounceTimerRef.current);
      }
    };
  }, [loadItems, selectedStreamId, token]);

  const streamIdsInCurrentList = useMemo(() => {
    return new Set(
      items.map((item) => item.origin?.streamId).filter((streamId): streamId is string => Boolean(streamId)),
    );
  }, [items]);

  const streamOptions = useMemo(() => {
    const filteredSubscriptions = subscriptions.filter(
      (subscription) => streamIdsInCurrentList.has(subscription.id) || subscription.id === selectedStreamId,
    );

    return [
      { id: defaultStreamId, title: defaultStreamTitle },
      ...filteredSubscriptions.map((subscription) => ({ id: subscription.id, title: subscription.title })),
    ];
  }, [defaultStreamId, defaultStreamTitle, selectedStreamId, streamIdsInCurrentList, subscriptions]);

  const subscriptionIconByStreamId = useMemo(() => {
    return new Map(
      subscriptions
        .map((subscription) => [subscription.id, normalizeIconUrl(subscription.iconUrl)] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
    );
  }, [subscriptions]);

  const { vipItems, regularItems } = useMemo(() => {
    const vip: InoreaderArticle[] = [];
    const regular: InoreaderArticle[] = [];

    for (const item of items) {
      const streamId = item.origin?.streamId;
      if (streamId && vipSourceIds.has(streamId)) {
        vip.push(item);
      } else {
        regular.push(item);
      }
    }

    return { vipItems: vip, regularItems: regular };
  }, [items, vipSourceIds]);

  const renderItem = useCallback(
    (item: InoreaderArticle, options?: { isVip?: boolean }) => {
      const articleUrl = getArticleUrl(item);
      const accessoryDate = getArticleDate(item);
      const decodedTitle = decodeHtmlEntities(item.title?.trim() || "Untitled article");
      const decodedSource = decodeHtmlEntities(item.origin?.title);
      const sourceStreamId = item.origin?.streamId;
      const isVipSource = Boolean(sourceStreamId && vipSourceIds.has(sourceStreamId));
      const subscriptionIcon = sourceStreamId ? subscriptionIconByStreamId.get(sourceStreamId) : undefined;
      const itemIcon = getItemIcon(item, subscriptionIcon);

      return (
        <List.Item
          key={item.id}
          icon={itemIcon}
          title={decodedTitle}
          subtitle={preferences.showSiteName ? decodedSource : undefined}
          accessories={
            accessoryDate
              ? [{ icon: options?.isVip ? Icon.Star : undefined, date: accessoryDate }]
              : options?.isVip
                ? [{ icon: Icon.Star }]
                : []
          }
          actions={
            <ActionPanel>
              {articleUrl ? (
                <Action
                  title="Open Article in Background"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: [], key: "return" }}
                  onAction={async () => {
                    try {
                      await openUrlInBackground(articleUrl);
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Couldn't open article in background",
                        message: normalizeErrorMessage(error),
                      });
                    }
                  }}
                />
              ) : null}
              {articleUrl ? (
                <Action.OpenInBrowser
                  title="Open Article"
                  url={articleUrl}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
              ) : null}
              {sourceStreamId && isVipSource ? (
                <Action
                  title="Remove Source from VIP"
                  icon={Icon.StarDisabled}
                  onAction={() => void removeSourceFromVip(sourceStreamId, decodedSource)}
                />
              ) : null}
              {sourceStreamId && !isVipSource ? (
                <Action
                  title="Add Source as VIP"
                  icon={Icon.Star}
                  onAction={() => void addSourceToVip(sourceStreamId, decodedSource)}
                />
              ) : null}
              <Action
                title="Save"
                icon={Icon.Bookmark}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => void saveItem(item)}
              />
              <Action
                title="Mark This Item as Read"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["opt"], key: "r" }}
                onAction={() => void markItemAsRead(item)}
              />
              <Action
                title="Mark All as Read"
                icon={Icon.Checkmark}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => void markCurrentStreamAsRead()}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadItems(true)} />
              <Action
                title="Reload Followed Feeds"
                icon={Icon.List}
                onAction={() => void loadSubscriptions({ force: true })}
              />
              <Action title="Reconnect Inoreader" icon={Icon.Link} onAction={connect} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      );
    },
    [
      addSourceToVip,
      connect,
      loadItems,
      loadSubscriptions,
      markCurrentStreamAsRead,
      markItemAsRead,
      openExtensionPreferences,
      preferences.showSiteName,
      removeSourceFromVip,
      saveItem,
      subscriptionIconByStreamId,
      vipSourceIds,
    ],
  );

  if (!hasCheckedStoredToken || !hasLoadedVipSourceIds) {
    return <List isLoading searchBarPlaceholder="Loading Inoreader..." />;
  }

  if (!token) {
    const markdown = [
      "## Connect Inoreader",
      "",
      "Opening OAuth connection...",
      "",
      authError ? `Error: ${authError}` : "Authorize Inoreader in your browser to continue.",
    ].join("\n");

    return (
      <Detail
        isLoading={isAuthenticating}
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Connect Inoreader" icon={Icon.Link} onAction={connect} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingMore || isAuthenticating}
      searchBarPlaceholder="Search articles"
      searchBarAccessory={
        enableStreamSelection ? (
          <List.Dropdown tooltip="Followed Feed" storeValue onChange={setSelectedStreamId} value={selectedStreamId}>
            {streamOptions.map((stream) => (
              <List.Dropdown.Item key={stream.id} title={stream.title} value={stream.id} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
      pagination={{
        hasMore: Boolean(continuation),
        onLoadMore: () => void loadItems(false),
        pageSize,
      }}
    >
      {vipItems.length > 0 ? (
        <List.Section title="VIP">{vipItems.map((item) => renderItem(item, { isVip: true }))}</List.Section>
      ) : null}
      {regularItems.length > 0 ? (
        <List.Section title={vipItems.length > 0 ? "Feed" : undefined}>
          {regularItems.map((item) => renderItem(item))}
        </List.Section>
      ) : null}
    </List>
  );
}

export default function Command() {
  return <FeedView />;
}
