import { getAccessToken, usePromise, OAuthService } from "@raycast/utils";
import { WebClient } from "@slack/web-api";
import { confirmAlert } from "@raycast/api";

let webClient: WebClient;

export function useSlack() {
  const { token } = getAccessToken();
  webClient = webClient ?? new WebClient(token);
  return webClient;
}

export function useSlackProfileAndDndInfo(slackAuth: OAuthService) {
  const slack = useSlack();

  return usePromise(async () => {
    const profileResponse = await slack.users.profile.get();
    if (!profileResponse.ok) {
      throw Error("Failed to fetch profile");
    }

    let dndResponse;
    let dndCalled = false;

    while (!dndCalled) {
      try {
        dndResponse = await slack.dnd.info();
        dndCalled = true;
        if (!dndResponse.ok) {
          throw Error("Failed to fetch DND info");
        }
      } catch (error: unknown) {
        // We added new scopes for DND. Old installs don't automatically upgrade scopes.
        // The `instanceof` is a type guard.
        if (!(error instanceof Error) || !error.message.includes("missing_scope")) {
          throw error;
        }

        // We don't care about the response. The user *needs* to reconnect.
        // There's no option for a cancel-less alert AFAIK.
        await confirmAlert({
          title: "Missing permissions after upgrade",
          message: "Reconnect your Slack account to get the right permissions.",
        });

        await slackAuth.client.removeTokens();
        await slackAuth.authorize();
        // The loop will re-attempt the DND call.
      }
    }

    return {
      profile: profileResponse.profile,
      dnd: dndResponse,
    };
  });
}
