import { OAuth, LocalStorage } from "@raycast/api";
import fetch, { RequestInfo } from "node-fetch";
import { Board, BoardMember } from "@mirohq/miro-api";

// Miro App client ID
const clientId = "3458764538138428083";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Miro",
  providerIcon: "miro-logo.png",
  providerId: "miro",
  description: "Connect your Miro account.",
});

// Authorization
export async function authorize() {
  const teamId = await LocalStorage.getItem("teamId");
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken) {
      if (tokenSet.isExpired() || !teamId) {
        const tokens = await refreshTokens(tokenSet.refreshToken);
        await client.setTokens(tokens);
      }
      return;
    } else if (teamId) {
      return;
    }
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://miro.oauth.raycast.com/authorize",
    clientId: clientId,
    scope: "",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);
}

// Fetch tokens
export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://miro.oauth.raycast.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const result = (await response.json()) as OAuth.TokenResponse & { team_id: string };
  await LocalStorage.setItem("teamId", result.team_id);
  return result;
}

// Refresh tokens
async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://miro.oauth.raycast.com/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse & { team_id: string };
  await LocalStorage.setItem("teamId", tokenResponse.team_id);
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

// Fetch my boards
export async function fetchMyItems(): Promise<Board[]> {
  const teamId = await LocalStorage.getItem("teamId");

  if (typeof teamId !== "string") {
    throw new Error("Team ID not found");
  }

  return fetchItems(`https://api.miro.com/v2/boards?team_id=${teamId}&sort=default`);
}

// Fetch recent boards
export async function fetchRecentItems(): Promise<Board[]> {
  return fetchItems(`https://api.miro.com/v2/boards?sort=default`);
}

// Fetch boards
async function fetchItems(url: RequestInfo): Promise<Board[]> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }

  const json = (await response.json()) as { data: Board[] };
  return json.data;
}

// Create board
export async function createItem(title: string, description: string): Promise<boolean> {
  await authorize();

  const teamId = await LocalStorage.getItem("teamId");

  if (typeof teamId !== "string") {
    throw new Error("Team ID not found");
  }

  const response = await fetch(`https://api.miro.com/v2/boards?team_id=${teamId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify({
      name: title,
      description: description,
    }),
  });

  if (!response.ok) {
    console.error("create item error:", await response.text());
    throw new Error(response.statusText);
  }

  return true;
}

interface BoardMemberProps {
  email: string;
  role: BoardMember["role"];
}

// Share board
export async function inviteToBoard(id: string, member: BoardMemberProps, message: string): Promise<boolean> {
  const response = await fetch(`https://api.miro.com/v2/boards/${id}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify({
      emails: [member.email],
      role: member.role,
      message: message,
    }),
  });

  if (!response.ok) {
    console.error("share item error:", await response.text());
    throw new Error(response.statusText);
  }

  return true;
}

// fetch board members
export async function getBoardMembers(id: string): Promise<BoardMember[]> {
  const response = await fetch(`https://api.miro.com/v2/boards/${id}/members`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("fetch members error:", await response.text());
    throw new Error(response.statusText);
  }

  const json = (await response.json()) as { data: BoardMember[] };
  return json.data;
}

// remove board member
export async function removeBoardMember(id: string, memberId: string): Promise<boolean> {
  const response = await fetch(`https://api.miro.com/v2/boards/${id}/members/${memberId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("remove member error:", await response.text());
    throw new Error(response.statusText);
  }

  return true;
}

// change board member role
export async function changeBoardMemberRole(id: string, memberId: string, role: BoardMember["role"]): Promise<boolean> {
  const response = await fetch(`https://api.miro.com/v2/boards/${id}/members/${memberId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify({
      role: role,
    }),
  });

  if (!response.ok) {
    console.error("change member role error:", await response.text());
    throw new Error(response.statusText);
  }

  return true;
}

// fetch board members
export async function deleteBoard(id: string): Promise<void> {
  const response = await fetch(`https://api.miro.com/v2/boards/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("delete board error:", await response.text());
    throw new Error(response.statusText);
  }

  return;
}
