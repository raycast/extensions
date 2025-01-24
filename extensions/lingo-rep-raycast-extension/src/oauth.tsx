import _ from "lodash";
import { useEffect } from "react";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { OAuthService, withAccessToken, getAccessToken, useCachedState, useFetch } from "@raycast/utils";

import { useGet } from "./hooks";
import { config } from "./config";

export const githubService = OAuthService.github({
  scope: "read:user user:email",
});

export const googleService = OAuthService.google({
  clientId: "797589717240-9353d3f7bnfssqgo6ci8kv4rfai9rfu6.apps.googleusercontent.com",
  scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
});

function UserProfileComponent({ authProvider }: { authProvider: "github" | "google" }) {
  const { token } = getAccessToken();
  const [, setJWT] = useCachedState<string>("jwt", "");
  const [, setAuthProvider] = useCachedState<string>("authProvider", "");
  const [, setUserId] = useCachedState<string>("userId", "");

  // TODO: decide on the refresh strategy

  const { data: responseData } = useFetch<{ message: string; jwt: string }>(
    `http://localhost:8787/api/auth/${authProvider}/get-jwt`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  useEffect(() => {
    if (responseData?.jwt) {
      setJWT(responseData.jwt);
      setAuthProvider(authProvider);
    } else {
      console.log("No JWT received");
      setJWT("");
      setAuthProvider("");
    }
  }, [responseData?.jwt]);

  const { isLoading, response } = useGet("/auth/profile");

  useEffect(() => {
    setUserId(_.get(response, "user.id", ""));
  }, [response]);

  const markdown = `
  <img src="${_.get(response, "user.imageUrl")}" width="300" height="300">
  `;

  const freeTierText = "Free Tier";
  const subscriptionText = (() => {
    const userSubscription: { endDate: number; cancelAt: number } | undefined = _.get(response, "user.subscription");
    if (!userSubscription) return freeTierText;
    const { cancelAt, endDate } = userSubscription;
    if (cancelAt && cancelAt * 1000 > Date.now())
      return `Cancelled (Active until ${new Date(cancelAt * 1000).toLocaleDateString()})`;
    else if (endDate * 1000 > Date.now()) return `Active (until ${new Date(endDate * 1000).toLocaleDateString()})`;
    else return `Expired (${new Date(endDate * 1000).toLocaleDateString()})`;
  })();

  const shouldUpgrade = subscriptionText === freeTierText || subscriptionText.startsWith("Expired");
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Full Name" text={_.get(response, "user.name")} />
          <Detail.Metadata.Label title="Email" text={_.get(response, "user.email")} />
          <Detail.Metadata.Label title="Subscription" text={subscriptionText} />
        </Detail.Metadata>
      }
      actions={
        shouldUpgrade ? (
          <ActionPanel title="Upgrade Subscription">
            <Action.OpenInBrowser url={`${config.lpURL}/#pricing`} title="Upgrade Subscription" />
          </ActionPanel>
        ) : (
          <ActionPanel title="Learn & Repeat Words">
            <Action.OpenInBrowser url={`${config.lpURL}/learn`} title="Learn & Repeat Words" />
          </ActionPanel>
        )
      }
    />
  );
}

export const UserProfilePageGithub = withAccessToken(githubService)(() => (
  <UserProfileComponent authProvider="github" />
));
export const UserProfilePageGoogle = withAccessToken(googleService)(() => (
  <UserProfileComponent authProvider="google" />
));
