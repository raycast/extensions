import { getPreferenceValues, OAuth } from "@raycast/api";
import { OAuthService, withAccessToken } from "@raycast/utils";
import axios, { AxiosInstance } from "axios";

let todoistApi: AxiosInstance | null = null;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Todoist",
  providerIcon: "todoist.png",
  providerId: "todoist",
  description: "Connect your Todoist account",
});

const { token } = getPreferenceValues<Preferences>();

export const todoist = new OAuthService({
  client,
  clientId: "9c06463da9ea494aa21fd881140b9dd4",
  scope: "data:read_write,data:delete,project:delete",
  authorizeUrl: "https://todoist.oauth-proxy.raycast.com/authorize",
  tokenUrl: "https://todoist.oauth-proxy.raycast.com/token",
  personalAccessToken: token || undefined,
  onAuthorize({ token }) {
    todoistApi = axios.create({
      baseURL: "https://api.todoist.com/api/v1",
      headers: { authorization: `Bearer ${token}` },
    });
  },
});

export const withTodoistApi = withAccessToken(todoist);

export function getTodoistApi() {
  if (!todoistApi) {
    throw new Error("getTodoistApi must be used when authenticated");
  }

  return todoistApi;
}
