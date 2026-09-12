import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { ShortLinksResponse, useShortLinks } from "@hooks/use-short-links";
import { DUB_APP_URL, DUB_CO_URL } from "@utils/constants";
import { deleteShortLink } from "@/api";
import { MutatePromise, showFailureToast, useCachedState } from "@raycast/utils";
import { withDubClient } from "./with-dub-client";
import { useState } from "react";

export function SearchLinks() {
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [showDetails, setShowDetails] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "dub-search-links",
  });
  const {
    shortLinks,
    supportsLinksTypeahead,
    error: linksError,
    isLoading: isLoadingLinks,
    mutate,
  } = useShortLinks(query);

  return (
    <List
      isLoading={isLoadingLinks}
      {...(!supportsLinksTypeahead
        ? { searchBarPlaceholder: "Search links by domain, url, key, comments, tags" }
        : {
            onSearchTextChange: setQuery,
            searchBarPlaceholder: "Search links by short link slug or destination url",
            throttle: true,
          })}
      isShowingDetail={!isLoadingLinks && !linksError && shortLinks?.length !== 0 && showDetails}
      filtering
    >
      {linksError && (
        <List.EmptyView
          title="Failed to fetch short links"
          description={linksError.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!linksError && shortLinks?.length === 0 && (
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
          workspaceId,
        } = value;
        const shortUrl = `${domain}/${key}`;
        return (
          <List.Item
            key={shortUrl}
            keywords={[
              domain,
              key,
              url,
              id,
              shortUrl,
              userId ?? "",
              comments ?? "",
              ...(tags ?? []).map((t) => t.name),
            ]}
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
                <Action.OpenInBrowser
                  title={"Open Link Page"}
                  url={`${DUB_CO_URL}/${workspaceId}/links/${domain}/${key}`}
                />
                <Action
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  title={"Delete Link"}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => deleteLink(id, mutate)}
                />
                <ActionPanel.Section>
                  <Action
                    title={showDetails ? "Hide Details" : "Show Details"}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowDetails(!showDetails)}
                    icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
                  />
                  <Action.OpenInBrowser
                    title="Open Analytics Page"
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                    url={`${DUB_APP_URL}/${workspaceId}/analytics?domain=${domain}&key=${key}&interval=30d`}
                  />
                  <Action.OpenInBrowser
                    title="Open Events Page"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    url={`${DUB_APP_URL}/${workspaceId}/events?domain=${domain}&key=${key}&interval=30d`}
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

const deleteLink = (linkId: string, mutate: MutatePromise<ShortLinksResponse | undefined>) =>
  confirmAlert({
    title: "Delete Link",
    message: "Are you sure you want to delete this link?",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: () => tryDeleteLink(linkId, mutate),
    },
  });

const tryDeleteLink = async (linkId: string, mutate: MutatePromise<ShortLinksResponse | undefined>) => {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting link..." });
  await mutate(deleteShortLink(linkId), {
    optimisticUpdate: (data) => {
      if (!data) return undefined;

      return {
        ...data,
        links: data.shortLinks.filter((l) => l.id !== linkId),
      };
    },
  })
    .then(async ({ id }) => {
      toast.style = Toast.Style.Success;
      toast.title = "✅ Link deleted";
      toast.message = `with id ${id}`;
    })
    .catch(async (err) => {
      await showFailureToast(err, {
        title: "❗ Failed to delete link",
        primaryAction: {
          title: "Retry",
          onAction: () => tryDeleteLink(linkId, mutate),
        },
      });
    });
};

export default withDubClient(SearchLinks);
