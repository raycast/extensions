import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useShortLinks } from "./hooks/use-short-links";
import { useWorkspaces } from "./hooks/use-workspaces";
import { useState } from "react";
import { DUB_CO_URL } from "./utils/constants";
import { deleteShortLink } from "./api";
import { showFailureToast } from "@raycast/utils";
import { WorkspaceAccessory } from "./components/workspace-accessory";

export default function SearchLinks() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const { workspaces, isLoading: isLoadingWorkspaces, error: workspacesError } = useWorkspaces();
  const { shortLinks, error: linksError, isLoading: isLoadingLinks, revalidate } = useShortLinks({ workspaceId });

  return (
    <List
      isLoading={isLoadingWorkspaces || isLoadingLinks}
      isShowingDetail={
        !isLoadingWorkspaces && !isLoadingLinks && !workspacesError && !linksError && shortLinks?.length !== 0
      }
      searchBarPlaceholder={"Search links by domain, url, key, comments, tags..."}
      filtering
      searchBarAccessory={
        <WorkspaceAccessory {...{ setWorkspaceId, revalidate, workspaces, isLoading: isLoadingWorkspaces }} />
      }
    >
      {workspacesError && (
        <List.EmptyView
          title={workspacesError.name}
          description={workspacesError.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {linksError && (
        <List.EmptyView
          title={linksError.name}
          description={linksError.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!workspacesError && !linksError && shortLinks?.length === 0 && (
        <List.EmptyView title="No short links found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {(shortLinks ?? []).map((value) => {
        const {
          domain,
          key,
          tags,
          shortLink,
          id,
          comments,
          userId,
          url,
          clicks,
          createdAt,
          expiresAt,
          expiredUrl,
          updatedAt,
        } = value;
        const shortUrl = `${domain}/${key}`;
        return (
          <List.Item
            key={shortUrl}
            keywords={[domain, key, url, id, shortUrl, userId, comments ?? "", ...(tags ?? []).map((t) => t.name)]}
            icon={{ source: Icon.Link, tintColor: Color.Blue }}
            title={shortUrl}
            accessories={[
              { text: String(clicks), icon: { source: Icon.Signal3, tintColor: Color.Green }, tooltip: "Clicks" },
              { date: new Date(updatedAt), icon: Icon.Calendar, tooltip: "Updated At" },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link title={"Short Link"} text={shortLink} target={shortLink} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link title={"Original Link"} text={url} target={url} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title={"Key"} text={key + ""} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Clicks"}
                      text={clicks + ""}
                      icon={{ source: Icon.Signal3, tintColor: Color.Green }}
                    />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title={"Created At"}
                      text={createdAt.substring(0, 19).replace("T", " ")}
                      icon={Icon.Calendar}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Updated At"}
                      text={updatedAt.substring(0, 19).replace("T", " ")}
                      icon={Icon.Calendar}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {expiresAt && (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title={"Expires At"}
                          text={expiresAt.substring(0, 19).replace("T", " ")}
                          icon={Icon.Clock}
                        />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    {expiredUrl && (
                      <>
                        <List.Item.Detail.Metadata.Link
                          title={"URL after expiration"}
                          text={expiredUrl}
                          target={expiredUrl}
                        />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    {comments && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Comments" icon={Icon.Bubble} text={comments} />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    {tags && tags.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.TagList title="Tags">
                          {tags.map((t) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={t.id}
                              text={t.name}
                              icon={Icon.Tag}
                              color={Color.Orange}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy Link"} content={shortLink} />
                <Action.OpenInBrowser title={"Open Link"} url={shortLink} />
                <Action
                  icon={Icon.Trash}
                  title={"Delete Link"}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => deleteLink(id, workspaceId, revalidate)}
                />
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Go to Dub.co"
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                    url={DUB_CO_URL}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

const deleteLink = (linkId: string, workspaceId: string, revalidate: () => void) =>
  confirmAlert({
    title: "Delete Link",
    message: "Are you sure you want to delete this link?",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting link..." });
        deleteShortLink({ linkId, workspaceId })
          .then(({ id }) => {
            toast.style = Toast.Style.Success;
            toast.title = "✅ Link deleted";
            toast.message = `with id ${id}`;
            revalidate();
          })
          .catch(async (err) => {
            captureException(err);
            await showFailureToast(err, {
              title: "❗ Failed to delete link",
              primaryAction: { title: "Retry", onAction: () => deleteLink(linkId, workspaceId, revalidate) },
            });
          });
      },
    },
  });
