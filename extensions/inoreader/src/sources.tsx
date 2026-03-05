import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  LocalStorage,
  OAuth,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = "https://www.inoreader.com/reader/api/0";
const AUTHORIZE_ENDPOINT = "https://www.inoreader.com/oauth2/auth";
const TOKEN_ENDPOINT = "https://www.inoreader.com/oauth2/token";
const REDIRECT_URI = "https://raycast.com/redirect/extension";

const SUBSCRIPTION_CACHE_KEY = "inoreader-subscriptions-cache-v1";
const VIP_SOURCE_IDS_STORAGE_KEY = "inoreader-vip-source-ids-v1";
const SUBSCRIPTION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ALL_FOLDERS_VALUE = "__all__";
const NO_FOLDER_VALUE = "__no_folder__";

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Inoreader",
  providerIcon: "inoreader-logo.png",
  description: "Connect your Inoreader account to manage followed feeds.",
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

type OAuthTokenResponse = OAuth.TokenResponse & {
  access_token: string;
  refresh_token?: string;
};

type FolderOption = {
  value: string;
  title: string;
};

type OAuthPreferences = Pick<Preferences.Sources, "clientId" | "clientSecret" | "scope">;

class InoreaderApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Inoreader API request failed with status ${status}`);
    this.name = "InoreaderApiError";
  }
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

function getScope(preferences: OAuthPreferences): string {
  return preferences.scope?.trim() ? preferences.scope.trim() : "read write";
}

function isUnauthorized(error: unknown): error is InoreaderApiError {
  return error instanceof InoreaderApiError && error.status === 401;
}

function isInvalidClientTokenError(status: number, body: string): boolean {
  const text = body.toLowerCase();
  return (status === 400 || status === 401) && (text.includes("invalid_client") || text.includes("client secret"));
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
    return new Set(parsed.sourceIds.map((id) => id.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function fetchTokens(
  params: URLSearchParams,
  preferences: OAuthPreferences,
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
    body.set("client_id", clientId);

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

    const response = await fetch(TOKEN_ENDPOINT, { method: "POST", headers, body });
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

async function authorizeAndGetToken(preferences: OAuthPreferences): Promise<string> {
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

async function getAccessToken(preferences: OAuthPreferences, interactive: boolean): Promise<string | undefined> {
  const tokens = await oauthClient.getTokens();
  if (tokens?.accessToken) {
    if (tokens.refreshToken && tokens.isExpired()) {
      try {
        const params = new URLSearchParams();
        params.set("client_id", preferences.clientId.trim());
        params.set("refresh_token", tokens.refreshToken);
        params.set("grant_type", "refresh_token");

        const tokenResponse = await fetchTokens(params, preferences, tokens.refreshToken);
        await oauthClient.setTokens(tokenResponse);
        return tokenResponse.access_token;
      } catch {
        await oauthClient.removeTokens();
        if (interactive) {
          return authorizeAndGetToken(preferences);
        }
        return undefined;
      }
    }

    return tokens.accessToken;
  }

  if (!interactive) {
    return undefined;
  }

  return authorizeAndGetToken(preferences);
}

async function requestJson<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new InoreaderApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}

function getFolderName(category: InoreaderCategory): string | undefined {
  if (category.label?.trim()) {
    return category.label.trim();
  }

  const marker = "/label/";
  const idx = category.id.indexOf(marker);
  if (idx === -1) {
    return undefined;
  }
  const encoded = category.id.slice(idx + marker.length);
  if (!encoded) {
    return undefined;
  }
  return decodeURIComponent(encoded).trim() || undefined;
}

function getFolderNames(subscription: InoreaderSubscription): string[] {
  const names = (subscription.categories ?? [])
    .filter((category) => category.id.includes("/label/"))
    .map((category) => getFolderName(category))
    .filter((value): value is string => Boolean(value));

  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export default function Command() {
  const rawPreferences = getPreferenceValues<Preferences.Sources>();
  const preferences = useMemo(
    () => ({
      clientId: rawPreferences.clientId,
      clientSecret: rawPreferences.clientSecret,
      scope: rawPreferences.scope,
    }),
    [rawPreferences.clientId, rawPreferences.clientSecret, rawPreferences.scope],
  );

  const [token, setToken] = useState<string | undefined>(undefined);
  const [authError, setAuthError] = useState<string | undefined>(undefined);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasCheckedStoredToken, setHasCheckedStoredToken] = useState(false);

  const [subscriptions, setSubscriptions] = useState<InoreaderSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [vipSourceIds, setVipSourceIds] = useState<Set<string>>(new Set());
  const [hasLoadedVipSourceIds, setHasLoadedVipSourceIds] = useState(false);
  const [folderFilter, setFolderFilter] = useState<string>(ALL_FOLDERS_VALUE);
  const hasAttemptedAutoConnectRef = useRef(false);

  const handleUnauthorized = useCallback(async () => {
    setToken(undefined);
    setAuthError("Your Inoreader session expired. Reconnect to continue.");
    await oauthClient.removeTokens();
  }, []);

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

      setIsLoading(true);
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
                const sortedCached = [...parsed.subscriptions].sort((a, b) => a.title.localeCompare(b.title));
                setSubscriptions(sortedCached);
                setIsLoading(false);
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
      } finally {
        setIsLoading(false);
      }
    },
    [handleUnauthorized, token],
  );

  const persistVipSourceIds = useCallback(async (nextVipSourceIds: Set<string>) => {
    const payload: VipSourceIdsStorage = {
      sourceIds: [...nextVipSourceIds].sort(),
    };
    await LocalStorage.setItem(VIP_SOURCE_IDS_STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const addSourceToVip = useCallback(
    async (subscription: InoreaderSubscription) => {
      if (vipSourceIds.has(subscription.id)) {
        return;
      }

      const nextVipSourceIds = new Set(vipSourceIds);
      nextVipSourceIds.add(subscription.id);
      setVipSourceIds(nextVipSourceIds);

      try {
        await persistVipSourceIds(nextVipSourceIds);
        await showToast({
          style: Toast.Style.Success,
          title: "Source added as VIP",
          message: subscription.title,
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
    async (subscription: InoreaderSubscription) => {
      if (!vipSourceIds.has(subscription.id)) {
        return;
      }

      const nextVipSourceIds = new Set(vipSourceIds);
      nextVipSourceIds.delete(subscription.id);
      setVipSourceIds(nextVipSourceIds);

      try {
        await persistVipSourceIds(nextVipSourceIds);
        await showToast({
          style: Toast.Style.Success,
          title: "Source removed from VIP",
          message: subscription.title,
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
    if (!token) {
      return;
    }
    void loadSubscriptions();
  }, [loadSubscriptions, token]);

  const folderOptions = useMemo(() => {
    const names = new Set<string>();
    for (const subscription of subscriptions) {
      for (const folder of getFolderNames(subscription)) {
        names.add(folder);
      }
    }

    const folders = [...names].sort((a, b) => a.localeCompare(b));
    const options: FolderOption[] = [
      { value: ALL_FOLDERS_VALUE, title: "All Folders" },
      { value: NO_FOLDER_VALUE, title: "No Folder" },
      ...folders.map((folder) => ({ value: folder, title: folder })),
    ];
    return options;
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    if (folderFilter === ALL_FOLDERS_VALUE) {
      return subscriptions;
    }

    if (folderFilter === NO_FOLDER_VALUE) {
      return subscriptions.filter((subscription) => getFolderNames(subscription).length === 0);
    }

    return subscriptions.filter((subscription) => getFolderNames(subscription).includes(folderFilter));
  }, [folderFilter, subscriptions]);

  const { vipSubscriptions, nonVipSubscriptions } = useMemo(() => {
    const vip: InoreaderSubscription[] = [];
    const nonVip: InoreaderSubscription[] = [];

    for (const subscription of filteredSubscriptions) {
      if (vipSourceIds.has(subscription.id)) {
        vip.push(subscription);
      } else {
        nonVip.push(subscription);
      }
    }

    return { vipSubscriptions: vip, nonVipSubscriptions: nonVip };
  }, [filteredSubscriptions, vipSourceIds]);

  const renderSubscription = useCallback(
    (subscription: InoreaderSubscription, isVip: boolean) => {
      const folders = getFolderNames(subscription);
      const hasFolders = folders.length > 0;

      return (
        <List.Item
          key={subscription.id}
          icon={isVip ? Icon.Star : Icon.Rss}
          title={subscription.title}
          subtitle={hasFolders ? folders.join(" · ") : "No Folder"}
          actions={
            <ActionPanel>
              {isVip ? (
                <Action
                  title="Remove Source from VIP"
                  icon={Icon.StarDisabled}
                  onAction={() => void removeSourceFromVip(subscription)}
                />
              ) : (
                <Action title="Add Source as VIP" icon={Icon.Star} onAction={() => void addSourceToVip(subscription)} />
              )}
              <Action
                title="Reload Sources from Inoreader"
                icon={Icon.Download}
                onAction={() => void loadSubscriptions({ force: true })}
              />
              <Action title="Reconnect Inoreader" icon={Icon.Link} onAction={connect} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      );
    },
    [addSourceToVip, connect, loadSubscriptions, openExtensionPreferences, removeSourceFromVip],
  );

  if (!hasCheckedStoredToken || !hasLoadedVipSourceIds) {
    return <List isLoading searchBarPlaceholder="Loading Inoreader sources..." />;
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
      isLoading={isAuthenticating || isLoading}
      searchBarPlaceholder="Filter sources by name"
      searchBarAccessory={
        <List.Dropdown tooltip="Folder filter" storeValue onChange={setFolderFilter} value={folderFilter}>
          {folderOptions.map((folder) => (
            <List.Dropdown.Item key={folder.value} title={folder.title} value={folder.value} />
          ))}
        </List.Dropdown>
      }
    >
      {vipSubscriptions.length > 0 ? (
        <List.Section title={`VIP (${vipSubscriptions.length})`}>
          {vipSubscriptions.map((subscription) => renderSubscription(subscription, true))}
        </List.Section>
      ) : null}
      {nonVipSubscriptions.length > 0 ? (
        <List.Section title={`Non VIP (${nonVipSubscriptions.length})`}>
          {nonVipSubscriptions.map((subscription) => renderSubscription(subscription, false))}
        </List.Section>
      ) : null}
    </List>
  );
}
