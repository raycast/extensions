import { getAccessToken, usePromise } from "@raycast/utils";
import { WebClient } from "@slack/web-api";

let webClient: WebClient;

export function useSlack() {
  const { token } = getAccessToken();
  webClient = webClient ?? new WebClient(token);
  return webClient;
}

export function useSlackProfile() {
  const slack = useSlack();
  return usePromise(async () => {
    const response = await slack.users.profile.get();
    if (!response.ok) {
      throw Error("Failed to fetch profile");
    }
    return response.profile;
  });
}
