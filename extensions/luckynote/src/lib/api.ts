import { getPreferenceValues, LocalStorage, OAuth } from "@raycast/api";

export function serverUrl() {
  const url = new URL(getPreferenceValues<Preferences>().serverUrl?.trim() || "https://luckynote.io");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
  ) {
    throw new Error("Use an HTTPS Luckynote server origin, or HTTP localhost for development.");
  }
  return url.origin;
}

export function apiUrl() {
  const url = new URL(serverUrl());
  // The repository's local web app and API run on separate development ports.
  if (["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "3000") {
    url.port = "4000";
  }
  return url.origin;
}

export function authClient() {
  return new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Luckynote",
    providerId: `luckynote-${serverUrl()}`,
    providerIcon: "icon-original.png",
    description: "Connect through your browser to save notes to Luckynote.",
  });
}

export async function disconnect() {
  await authClient().removeTokens();
  // Remove credentials and folder data from the previous password-based extension.
  for (const key of ["accessToken", "refreshToken", "homeFolder"]) await LocalStorage.removeItem(key);
}

export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  authenticated = true
): Promise<T> {
  const client = authClient();
  const tokens = authenticated ? await client.getTokens() : undefined;
  if (authenticated && !tokens?.accessToken) throw new Error("Open Save Message to connect to Luckynote.");
  const response = await fetch(`${apiUrl()}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tokens?.accessToken && { "x-token": tokens.accessToken }),
      ...(tokens?.refreshToken && { "x-refresh-token": tokens.refreshToken }),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  // The API renews expired JWTs in middleware and returns them on the same response.
  if (tokens && response.headers.get("x-token")) {
    await client.setTokens({
      accessToken: response.headers.get("x-token")!,
      refreshToken: response.headers.get("x-refresh-token") || tokens.refreshToken,
    });
  }
  if (response.status === 401) {
    if (authenticated) await disconnect();
    throw new Error("Your connection expired. Open Save Message to connect again.");
  }
  if (!response.ok) throw new Error(`Luckynote request failed (${response.status}). Please try again.`);
  const result = (await response.json()) as {
    data?: T;
    errors?: { extensions?: { code?: string } }[];
  };
  if (result.errors?.length) {
    if (result.errors.some((error) => error.extensions?.code === "UNAUTHENTICATED")) {
      if (authenticated) await disconnect();
      throw new Error("Your connection expired. Open Save Message to connect again.");
    }
    throw new Error("Luckynote could not complete this request. Please try again.");
  }
  if (!result.data) throw new Error("Luckynote returned an incomplete response. Please try again.");
  return result.data;
}

export async function connect() {
  const client = authClient();
  const request = await client.authorizationRequest({
    endpoint: `${serverUrl()}/raycast-auth`,
    clientId: "luckynote-raycast",
    scope: "",
  });
  const { authorizationCode } = await client.authorize(request);
  const data = await graphql<{
    exchangeExtensionAuthCode: { __typename: string; token?: string; refreshToken?: string };
  }>(
    `
      mutation ConnectRaycast($data: ExchangeExtensionAuthCodeInput!) {
        exchangeExtensionAuthCode(data: $data) {
          __typename
          ... on AuthPayload {
            token
            refreshToken
          }
        }
      }
    `,
    {
      data: {
        extensionId: "raycast",
        code: authorizationCode,
        codeVerifier: request.codeVerifier,
        redirectUri: request.redirectURI,
      },
    },
    false
  );
  const payload = data.exchangeExtensionAuthCode;
  if (payload.__typename !== "AuthPayload" || !payload.token || !payload.refreshToken) {
    throw new Error("This connection request expired or could not be completed. Please try connecting again.");
  }
  await disconnect();
  await client.setTokens({ accessToken: payload.token, refreshToken: payload.refreshToken });
}

export interface Account {
  id: string;
  fullName?: string;
  homeFolder: string;
}
export async function getAccount(): Promise<Account> {
  const data = await graphql<{ me: Account }>("query RaycastAccount { me { id fullName homeFolder } }");
  if (!data.me?.homeFolder) throw new Error("Your account has no Inbox available. Open Luckynote to finish setup.");
  return data.me;
}

export interface Folder {
  id: string;
  title: string;
  path?: string;
}
export async function getFolders(search = ""): Promise<Folder[]> {
  if (search.trim()) {
    const data = await graphql<{ findFolders: { folders: Folder[] } }>(
      `
        query RaycastFindFolders($data: FindFoldersInput!) {
          findFolders(data: $data) {
            folders {
              id
              title
              path
            }
          }
        }
      `,
      { data: { text: search.trim(), count: 50 } }
    );
    return data.findFolders.folders;
  }
  const data = await graphql<{ getHomeFolders: { folders: Folder[] } }>(`
    query RaycastFolders {
      getHomeFolders(data: {}) {
        folders {
          id
          title
        }
      }
    }
  `);
  return data.getHomeFolders.folders;
}

export async function saveMessage(folderId: string, title: string, body = "", task = false) {
  const autoTask = title.trimStart().startsWith("-");
  const cleanTitle = autoTask ? title.trimStart().slice(1).trim() : title.trim();
  if (!cleanTitle) throw new Error("Please enter a note title.");
  const data = await graphql<{ createMessage: { id: string; title?: string } }>(
    `
      mutation RaycastSave($data: CreateMessageInput!) {
        createMessage(data: $data) {
          id
          title
        }
      }
    `,
    {
      data: {
        folderId,
        content: {
          title: cleanTitle,
          body: body || undefined,
          isCheckbox: task || autoTask,
          metadata: { savedFrom: { type: "EXTENSION", device: "Raycast" } },
        },
      },
    }
  );
  if (!data.createMessage?.id) throw new Error("Luckynote did not confirm the save. Check your Inbox before retrying.");
  return data.createMessage;
}
