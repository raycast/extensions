import { showToast, popToRoot, List, Toast, ActionPanel, Action, Icon } from "@raycast/api";
import { AccountInfo } from "./types";
import { WistiaMediaListItem } from "./wistia-media-list-item";
import { fetchAccountInfo, fetchMedias } from "./api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

export default function Command() {
  const [accountInfo, setAccountInfo] = useCachedState<AccountInfo>("account-info");

  const { isLoading, data: medias } = useCachedPromise(
    async () => {
      const [accountInfo, medias] = await Promise.all([fetchAccountInfo(), fetchMedias()]);
      setAccountInfo(accountInfo);
      return medias;
    },
    [],
    {
      initialData: [],
      async onError(error) {
        if (error.message === "unauthorized_credentials") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Credentials",
            message: "Check your API token and try again.",
          });
          popToRoot({ clearSearchBar: true });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load projects",
          });
        }
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by name or hashed id">
      {!isLoading && !medias.length && (
        <List.EmptyView
          icon="content-library.svg"
          title="0 Media"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Plus} title="Add Media" url={`${accountInfo?.url}/content/media`} />
            </ActionPanel>
          }
        />
      )}
      {medias.map(
        (media) => accountInfo && <WistiaMediaListItem key={media.id} media={media} accountInfo={accountInfo} />,
      )}
    </List>
  );
}
