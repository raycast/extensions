import { showToast, popToRoot, List, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { AccountInfo, WistiaApiError, WistiaMedia } from "./types";
import { WistiaMediaListItem } from "./wistia-media-list-item";
import { fetchAccountInfo, fetchMedias } from "./api";

interface State {
  medias?: WistiaMedia[];
  error?: unknown;
}

export default function Command() {
  const [state, setState] = useState<State>({});
  const [accountInfo, setAccountInfo] = useState<AccountInfo>();

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountInfo, medias] = await Promise.all([fetchAccountInfo(), fetchMedias()]);

        setAccountInfo(accountInfo);
        setState({ medias: medias });
      } catch (error: unknown) {
        if ((error as WistiaApiError)?.code === "unauthorized_credentials") {
          showToast(ToastStyle.Failure, "Invalid Credentials", "Check your API token and try again.");
          popToRoot({ clearSearchBar: true });
        } else {
          showToast(ToastStyle.Failure, "Failed to load medias");
        }
      }
    }

    fetchData();
  }, []);

  return (
    <>
      <List
        isLoading={state.medias?.length === 0 || !state.medias}
        searchBarPlaceholder="Filter by name or hashed id..."
      >
        {state.medias?.map(
          (media) => accountInfo && <WistiaMediaListItem key={media.id} media={media} accountInfo={accountInfo} />
        )}
      </List>
    </>
  );
}
