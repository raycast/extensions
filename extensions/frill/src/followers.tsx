import { useEffect, useState } from "react";
import { deleteFollower, getFollowers } from "./lib/api";
import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import ErrorComponent from "./components/ErrorComponent";
import { getAvatarIcon } from "@raycast/utils";
import { Follower, GetFollowersResponse } from "./types/followers";
import { FRILL_URL } from "./lib/constants";
import { ErrorResponse } from "./types";

export default function Followers() {
  const [isLoading, setIsLoading] = useState(true);
  const [followersResponse, setFollowersResponse] = useState<GetFollowersResponse>();
  const [errorResponse, setErrorResponse] = useState<ErrorResponse>();

  async function getFollowersFromApi() {
    setIsLoading(true);
    const response = await getFollowers();
    if ("data" in response) {
      setFollowersResponse(response);
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${response.data.length} followers`,
      });
    } else setErrorResponse(response);
    setIsLoading(false);
  }

  useEffect(() => {
    getFollowersFromApi();
  }, []);

  async function confirmAndDeleteFollower(follower: Follower) {
    if (
      await confirmAlert({
        title: `Delete follower '${follower.name}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteFollower(follower.idx);
      if ("success" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted follower '${follower.name}`);
        await getFollowersFromApi();
      }
    }
  }

  return errorResponse ? (
    <ErrorComponent response={errorResponse} />
  ) : (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search follower">
      {followersResponse?.data.map((follower) => (
        <List.Item
          key={follower.idx}
          title={follower.name}
          icon={follower.avatar || getAvatarIcon(follower.name)}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="IDx" text={follower.idx} />
                  <List.Item.Detail.Metadata.Label title="Name" text={follower.name} />
                  <List.Item.Detail.Metadata.Label title="Avatar" icon={follower.avatar || Icon.Minus} />
                  {follower.email ? (
                    <List.Item.Detail.Metadata.Link
                      title="Email"
                      text={follower.email}
                      target={`mailto:${follower.email}`}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Email" icon={Icon.Minus} />
                  )}
                  <List.Item.Detail.Metadata.Label
                    title="Created At"
                    text={follower.created_at || ""}
                    icon={follower.created_at ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Updated At"
                    text={follower.updated_at || ""}
                    icon={follower.updated_at ? undefined : Icon.Minus}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`${FRILL_URL}dashboard/users/${follower.idx.replace("follower_", "")}`}
                icon={Icon.Globe}
              />
              <ActionPanel.Section>
                <Action
                  title="Delete Follower"
                  style={Action.Style.Destructive}
                  icon={Icon.DeleteDocument}
                  onAction={() => confirmAndDeleteFollower(follower)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
