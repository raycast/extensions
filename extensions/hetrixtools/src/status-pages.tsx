import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { StatusPage } from "./types";
import useHetrixTools from "./use-hetrix-tools";
import { useCachedState } from "@raycast/utils";

export default function StatusPages() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-status-page-details", false);
  const { isLoading, data: pages, pagination } = useHetrixTools<StatusPage>("status-pages");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search status page"
      pagination={pagination}
      isShowingDetail={isShowingDetail}
    >
      {pages.map((page) => (
        <List.Item
          key={page.id}
          icon={Icon.Megaphone}
          title={page.name}
          accessories={isShowingDetail ? undefined : [{ tag: page.type }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link
                    title="ID"
                    text={page.id}
                    target={`https://hetrixtools.com/r/${page.id}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Name" text={page.name} />
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={page.type} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label
                    title="Password Protected"
                    icon={page.password_protected ? Icon.Check : Icon.Xmark}
                  />
                  {page.twitter_feed ? (
                    <List.Item.Detail.Metadata.Link
                      title="Twitter Feed"
                      text={page.twitter_user}
                      target={`https://x.com/${page.twitter_user}`}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Twitter Feed" icon={Icon.Minus} />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
              <Action.OpenInBrowser icon="hetrixtools.png" url="https://hetrixtools.com/dashboard/status-pages/" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
