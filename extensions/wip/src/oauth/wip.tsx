import { OAuth, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Todo, User, Project } from "../types";
import * as crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import mime from "mime-types";

const preferences = getPreferenceValues();
const environment = preferences.environment;

let clientId: string;
let oauthUrl: string;
let apiUrl: string;

if (environment === "development") {
  clientId = "RUe8R2Q4fS5t0LR16EewRRXpcWHaIWaSfLMT-nQd2Wk";
  oauthUrl = "http://wip.test:3000";
  apiUrl = "http://api.wip.test:3000/v1";
} else {
  clientId = "THXW84IpDZ58z9eYYCs3OcrG-vAwY6nUme1Ta4ckEHE";
  oauthUrl = "https://wip.co";
  apiUrl = "https://api.wip.co/v1";
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "WIP",
  providerIcon: "icon.png",
  providerId: "wip",
  description: "Connect your WIP account",
});

// Authorization

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: `${oauthUrl}/oauth/authorize`,
    clientId: clientId,
    scope: "",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(`${oauthUrl}/oauth/token`, { method: "POST", body: params });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(`${oauthUrl}/oauth/token`, { method: "POST", body: params });
  if (!response.ok) {
    console.log("oauthUrl:", oauthUrl);
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

// API

export async function fetchUser(): Promise<User> {
  const response = await fetch(`${apiUrl}/users/me.json`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch user error:", await response.text(), "URL:", response.url);
    throw new Error(response.statusText);
  }

  return (await response.json()) as User;
}

interface StreakResponse {
  streak: number;
  best_streak: number;
  streaking: boolean;
}

export async function fetchStreak(): Promise<StreakResponse> {
  const response = await fetch(`${apiUrl}/users/me.json`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch streak error:", await response.text(), "URL:", response.url);
    throw new Error(response.statusText);
  }
  return (await response.json()) as StreakResponse;
}

export async function fetchTodos(searchQuery: string = ""): Promise<Todo[]> {
  const params = new URLSearchParams();
  params.append("query", searchQuery);

  const response = await fetch(`${apiUrl}/users/me/todos.json?` + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const jsonResponse = (await response.json()) as { data: Todo[] };
  return jsonResponse.data;
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${apiUrl}/users/me/projects.json?limit=100`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const jsonResponse = (await response.json()) as { data: Project[] };
  return jsonResponse.data;
}

export async function createTodo(todoText: string, filePaths: string[] = []): Promise<void> {
  console.log("Received file paths:", filePaths); // Log received file paths
  const attachments = await Promise.all(
    filePaths.map(async (filePath) => {
      if (!fs.existsSync(filePath)) {
        console.error("File does not exist:", filePath);
        throw new Error("File does not exist");
      }
      const fileBuffer = fs.readFileSync(filePath);
      const checksum = crypto.createHash("md5").update(fileBuffer).digest("base64");
      const fileName = path.basename(filePath);
      const fileSize = fileBuffer.length;
      const fileTypeResult = await fileTypeFromBuffer(fileBuffer);
      const fileType = fileTypeResult?.mime || mime.lookup(filePath) || "application/octet-stream";

      const { url, signed_id, method, headers } = await createUpload(fileName, fileSize, checksum, fileType);

      console.log("Presigned URL", url);
      console.log("Signed ID", signed_id);
      console.log("Method", method);
      console.log("Headers", headers);

      const fileResponse = await fetch(url, {
        method: method,
        headers: headers,
        body: fileBuffer,
      });
      console.log("File upload response:", await fileResponse.text()); // Log file upload response

      if (!fileResponse.ok) {
        console.error("File upload error:", await fileResponse.text());
        throw new Error(fileResponse.statusText);
      }

      return signed_id;
    }),
  );

  const params = new URLSearchParams();
  params.append("body", todoText);
  attachments.forEach((attachment) => params.append("attachments[]", attachment));

  const response = await fetch(`${apiUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: params,
  });

  if (!response.ok) {
    console.error("create todo error:", await response.text());
    throw new Error(response.statusText);
  }
}

export async function createUpload(
  filename: string,
  byteSize: number,
  checksum: string,
  contentType: string,
): Promise<{ url: string; signed_id: string; method: string; headers: Record<string, string> }> {
  const response = await fetch(`${apiUrl}/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify({
      filename: filename,
      byte_size: byteSize,
      checksum: checksum,
      content_type: contentType,
    }),
  });

  if (!response.ok) {
    console.error("createUpload error:", await response.text());
    throw new Error(response.statusText);
  }

  return (await response.json()) as { url: string; signed_id: string; method: string; headers: Record<string, string> };
}
