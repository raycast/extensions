import { OAuth } from "@raycast/api"
import fetch from "node-fetch"
import { Task, TaskList, TaskLists, TasksList } from "../interfaces"

// Create an OAuth client ID via https://console.developers.google.com/apis/credentials
// As application type choose "iOS" (required for PKCE)
// As Bundle ID enter: com.raycast
const clientId = "160910858949-in59p5pq8l1h1gra6tk6fkkfol4gs1o4.apps.googleusercontent.com"

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "google-logo.png",
  providerId: "google",
  description: "Connect your Google account\n(Raytask Extension)",
})

// Authorization

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens()
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken))
    }
    return
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: clientId,
    scope:
      "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/tasks",
  })
  const { authorizationCode } = await client.authorize(authRequest)
  await client.setTokens(await fetchTokens(authRequest, authorizationCode))
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams()
  params.append("client_id", clientId)
  params.append("code", authCode)
  params.append("verifier", authRequest.codeVerifier)
  params.append("grant_type", "authorization_code")
  params.append("redirect_uri", authRequest.redirectURI)

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params })
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text())
    throw new Error(response.statusText)
  }
  return (await response.json()) as OAuth.TokenResponse
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams()
  params.append("client_id", clientId)
  params.append("refresh_token", refreshToken)
  params.append("grant_type", "refresh_token")

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params })
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text())
    throw new Error(response.statusText)
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken
  return tokenResponse
}

// API

export async function fetchLists(): Promise<TaskList[]> {
  // const params = new URLSearchParams()

  const response = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  })
  if (!response.ok) {
    console.error("fetch items error:", await response.text())
    throw new Error(response.statusText)
  }
  const json = (await response.json()) as TaskLists
  return json.items.map(item => item)
}

export async function fetchTasks(listId: string): Promise<Task[]> {
  // const params = new URLSearchParams()
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  })
  if (!response.ok) {
    console.error("fetch tasks error:", await response.text())
    throw new Error(response.statusText)
  }
  const json = (await response.json()) as TasksList

  return json.items.map(item => {
    item.list = listId
    return item
  })
}
export async function patchTask(taskId: string, listId: string, task: Partial<Task>): Promise<any> {
  // const params = new URLSearchParams()
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify(task)
  })
  if (!response.ok) {
    console.error("fetch tasks error:", await response.text())
    throw new Error(response.statusText)
  }
  return await response
}

export async function moveTask(listId: string, taskId: string): Promise<any> {

  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    }
  })
  if (!response.ok) {
    console.error("fetch tasks error:", await response.text())
    throw new Error(response.statusText)
  }
  return await response
}
export async function createTask(listId: string, task: any): Promise<any> {

  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify(task)
  })
  if (!response.ok) {
    console.error("fetch tasks error:", await response.text())
    throw new Error(response.statusText)
  }
  return await response
}

export async function deleteTask(listId: string, taskId: string): Promise<any> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  })
  if (!response.ok) {
    console.error("fetch tasks error:", await response.text())
    throw new Error(response.statusText)
  }
  return await response
}
