import { Action, ActionPanel, List, Toast, open, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AsyncData, Result } from "@swan-io/boxed";
import { formatBytes } from "./utils/helpers";
import { Link, debridUrl, deleteSavedLink, getSavedLinks } from "./utils/api";

export default function Command() {
  const [savedLinksRequest, setSavedLinksRequest] = useState(AsyncData.NotAsked<Result<Link[], string>>());

  const fetchLinks = async () => {
    setSavedLinksRequest(AsyncData.Loading);
    const res = await getSavedLinks();
    setSavedLinksRequest(AsyncData.Done(res));
  };

  const deleteLink = async (linkUrl: string) => {
    await deleteSavedLink(linkUrl);
    await fetchLinks();
    showToast({ title: "Link deleted !" });
  };

  const downloadLink = async (link: string) => {
    try {
      const debridedUrl = await debridUrl(link);

      debridedUrl.match({
        Ok: (link) => {
          open(link);
        },
        Error: () => {
          showToast({ title: "Unable to download magnet", style: Toast.Style.Failure });
        },
      });
    } catch (e) {
      console.log(e);
      showToast({ title: "Unable to download magnet", style: Toast.Style.Failure });
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  return (
    <List isShowingDetail={true} isLoading={savedLinksRequest.isLoading()}>
      {savedLinksRequest.match({
        NotAsked: () => <List.EmptyView />,
        Loading: () => <List.EmptyView />,
        Done: (results) => {
          return results.match({
            // @ts-ignore
            Ok: (links) => {
              return links.map((link) => {
                return (
                  <List.Item
                    key={link.filename}
                    title={link.filename}
                    detail={
                      <List.Item.Detail
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Filename" text={link.filename} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Host" text={link.host} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label
                              title="Date"
                              text={new Date(link.date * 1000).toDateString()}
                            />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Size" text={`${formatBytes(link.size)}`} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser url={link.link} />
                        <Action
                          title="Download"
                          onAction={() => {
                            downloadLink(link.link);
                          }}
                        />
                        <Action
                          title="Delete This Link"
                          onAction={() => {
                            deleteLink(link.link);
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              });
            },
            Error: () => {
              return <List.EmptyView title="An error occured while loading links" />;
            },
          });
        },
      })}
    </List>
  );
}
