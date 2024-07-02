import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useShortLinks } from "@hooks/use-short-links";
import { useWorkspaces } from "@hooks/use-workspaces";
import { useState } from "react";
import { DUB_CO_URL } from "@utils/constants";
import { deleteShortLink } from "@/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { LinkSchema } from "@/types";

export default function SearchLinks() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const { workspaces, isLoading: isLoadingWorkspaces, error: workspacesError } = useWorkspaces();
  const {
    shortLinks,
    error: linksError,
    isLoading: isLoadingLinks,
    mutate,
  } = useShortLinks({ workspaceId, workspacesError });

  return (
    <List
      isLoading={isLoadingWorkspaces || isLoadingLinks}
      isShowingDetail={
        !isLoadingWorkspaces && !isLoadingLinks && !workspacesError && !linksError && shortLinks?.length !== 0
      }
      searchBarPlaceholder={"Search links by domain, url, key, comments, tags..."}
      filtering
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Workspace"
          placeholder="Select Workspace"
          storeValue
          filtering
          isLoading={isLoadingWorkspaces}
          onChange={setWorkspaceId}
        >
          {(workspaces ?? []).map((w) => (
            <List.Dropdown.Item
              key={w.id}
              title={w.name}
              value={w.id}
              keywords={[w.id, w.name, w.slug]}
              icon={{ source: w.logo ?? "command-icon.png", mask: Image.Mask.Circle }}
            />
          ))}
        </List.Dropdown>
      }
    >
      {(workspacesError || linksError) && (
        <List.EmptyView
          title={workspacesError ? "Failed to fetch workspaces" : "Failed to fetch short links"}
          description={workspacesError?.message ?? linksError?.message}
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
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  title={"Delete Link"}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => deleteLink(id, workspaceId, mutate)}
                />
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Go to Dub.co"
                    shortcut={Keyboard.Shortcut.Common.Open}
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

const deleteLink = (linkId: string, workspaceId: string, mutate: MutatePromise<LinkSchema[]>) =>
  confirmAlert({
    title: "Delete Link",
    message: "Are you sure you want to delete this link?",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting link..." });
        await mutate(
          deleteShortLink({ linkId, workspaceId })
            .then(async ({ id }) => {
              toast.style = Toast.Style.Success;
              toast.title = "✅ Link deleted";
              toast.message = `with id ${id}`;
            })
            .catch(async (err) => {
              await showFailureToast(err, {
                title: "❗ Failed to delete link",
                primaryAction: { title: "Retry", onAction: () => deleteLink(linkId, workspaceId, mutate) },
              });
              throw err;
            }),
          { optimisticUpdate: (data) => data?.filter((l) => l.id !== linkId) },
        );
      },
    },
  });
