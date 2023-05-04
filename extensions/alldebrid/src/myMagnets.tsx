import { Action, ActionPanel, List, Toast, open, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AsyncData, Result } from "@swan-io/boxed";
import { formatBytes } from "./utils/helpers";
import { Magnet, deleteSavedMagnet, getSavedMagnets, saveLink } from "./utils/api";
import { debridUrl } from "./utils/api";

export default function Command() {
  const [savedLinksRequest, setSavedLinksRequest] = useState(AsyncData.NotAsked<Result<Magnet[], string>>());

  const fetchMagnets = async () => {
    setSavedLinksRequest(AsyncData.Loading);
    const res = await getSavedMagnets();
    setSavedLinksRequest(AsyncData.Done(res));
  };

  const deleteMagnet = async (linkUrl: string) => {
    try {
      await deleteSavedMagnet(linkUrl);
      showToast({ title: "Link deleted !" });
      await fetchMagnets();
    } catch (e) {
      console.log(e);
      showToast({ title: "Unable to delete magnet", style: Toast.Style.Failure });
    }
  };

  const saveMagnetLink = async (link: string) => {
    try {
      await saveLink(link);
      showToast({ title: "Magnet link saved !" });
    } catch (e) {
      console.log(e);
      showToast({ title: "Unable to save magnet", style: Toast.Style.Failure });
    }
  };

  const downloadMagnetLink = async (link: string) => {
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
    fetchMagnets();
  }, []);

  return (
    <List isShowingDetail={true} isLoading={savedLinksRequest.isLoading()}>
      {savedLinksRequest.match({
        NotAsked: () => <List.EmptyView />,
        Loading: () => <List.EmptyView />,
        Done: (results) => {
          return results.match({
            // @ts-ignore
            Ok: (magnets) => {
              return magnets.map((magnet) => {
                return (
                  <List.Item
                    key={magnet.filename}
                    title={magnet.filename}
                    detail={
                      <List.Item.Detail
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Filename" text={magnet.filename} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Size" text={`${formatBytes(magnet.size)}`} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        {magnet.links.length > 0 ? (
                          <>
                            <Action.OpenInBrowser url={magnet.links[0].link} />
                            <Action
                              title={"Save To My Links Folder"}
                              onAction={() => {
                                saveMagnetLink(magnet.links[0].link);
                              }}
                            />
                            <Action
                              title={"Download"}
                              onAction={() => {
                                downloadMagnetLink(magnet.links[0].link);
                              }}
                            />
                          </>
                        ) : null}

                        <ActionPanel.Section>
                          <Action
                            title="Delete This Magnet"
                            onAction={() => {
                              deleteMagnet(magnet.id.toString());
                            }}
                          />
                        </ActionPanel.Section>
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
