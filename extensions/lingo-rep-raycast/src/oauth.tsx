import _ from "lodash";
import { useEffect, useState } from "react";
import { Detail, ActionPanel, Action, showToast, popToRoot, Icon } from "@raycast/api";
import { OAuthService, withAccessToken, useCachedState, showFailureToast } from "@raycast/utils";

import { useGet } from "./hooks";
import { config } from "./config";

export const githubService = OAuthService.github({
  scope: "read:user user:email",
});

export const googleClientId = "797589717240-9353d3f7bnfssqgo6ci8kv4rfai9rfu6.apps.googleusercontent.com";
export const googleService = OAuthService.google({
  clientId: googleClientId,
  scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
});

function UserProfileDetails() {
  // TODO:
  // - decide on the refresh strategy for github

  const { isLoading, response } = useGet("/auth/profile");

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
            <Action.OpenInBrowser icon={Icon.Star} url={`${config.lpURL}/#pricing`} title="Upgrade Subscription" />
          </ActionPanel>
        ) : (
          <ActionPanel title="Learn & Repeat Words">
            <Action.OpenInBrowser icon={Icon.Globe} url={`${config.lpURL}/learn`} title="Learn & Repeat Words" />
          </ActionPanel>
        )
      }
    />
  );
}

export const UserProfilePageGithub = withAccessToken(githubService)(() => <UserProfileDetails />);
export const UserProfilePageGoogle = withAccessToken(googleService)(() => <UserProfileDetails />);

export function AuthorizationComponent({ authProvider }: { authProvider: "github" | "google" }) {
  const [, setAuthProvider] = useCachedState<string>("authProvider", "");

  const service = (() => {
    if (authProvider === "github") return githubService;
    else if (authProvider === "google") return googleService;
    else throw new Error("Invalid auth provider");
  })();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setAuthProvider(authProvider);
    (async () => {
      try {
        await service.authorize();
        setIsLoading(false);
        await showToast({ title: "Authorization Successful" });
      } catch (error) {
        console.error("error authorizing user", error);
        setIsLoading(false);
        await showFailureToast({ title: "Authorization Failed" });
      } finally {
        popToRoot();
      }
    })();
  }, [service]);

  return <Detail isLoading={isLoading} />;
}
