import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "react-query";
import { ActionGoDubCo } from "./components/action-go-dub-co";
import { ListEmptyView } from "./components/list-empty-view";
import { useDeleteShortLink, useGetAllShortLinks } from "./utils/api";

const queryClient = new QueryClient();
export default function SearchLinksWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <SearchLinks />
    </QueryClientProvider>
  );
}
function SearchLinks() {
  const { data: allLinks, isLoading } = useGetAllShortLinks();

  const { mutate: deleteShortLink, isLoading: isDeleting } = useDeleteShortLink();

  return (
    <List
      isLoading={isLoading || isDeleting}
      isShowingDetail={allLinks?.length !== 0 && true}
      searchBarPlaceholder={"Search links"}
    >
      <ListEmptyView title={"No Links"} icon={Icon.Link} />
      {allLinks?.map((value, index) => {
        const shortUrl = `${value.domain}/${value.key}`;
        const fullShortUrl = `https://${value.domain}/${value.key}`;
        return (
          <List.Item
            key={index}
            icon={{ source: { light: "link-icon.svg", dark: "link-icon@dark.svg" } }}
            title={shortUrl}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Short Link"} text={fullShortUrl} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Original Link"} text={value.url} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title={"Key"} text={value.key + ""} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Clicks"} text={value.clicks + ""} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title={"Created At"}
                      text={value.createdAt.substring(0, 19).replace("T", " ")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Updated At"}
                      text={value.updatedAt.substring(0, 19).replace("T", " ")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy Link"} content={fullShortUrl} />
                <Action.OpenInBrowser title={"Open Link"} url={fullShortUrl} />
                <Action
                  icon={Icon.Trash}
                  title={"Delete Link"}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => deleteShortLink(value.id)}
                />
                <ActionGoDubCo />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
