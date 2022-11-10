import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage, getUuid } from "../lib/utils";
import { Channel, searchChannels, useRefresher } from "../lib/youtubeapi";
import { ChannelItem } from "./channel";
import { ListOrGrid, getViewLayout, getGridItemSize } from "./listgrid";
import { RecentChannels, PinChannel } from "./recent_channels";

export function SearchChannelList() {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useRefresher<Channel[] | undefined>(async () => {
    if (searchText) {
      return await searchChannels(searchText);
    }
    return undefined;
  }, [searchText]);
  if (error) {
    showToast(Toast.Style.Failure, "Could not search channels", getErrorMessage(error));
  }
  const layout = getViewLayout();
  const itemSize = getGridItemSize();
  if (data) {
    return (
      <ListOrGrid
        layout={layout}
        itemSize={itemSize}
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        throttle={true}
      >
        {data?.map((c) => (
          <ChannelItem key={c.id} channel={c} actions={<PinChannel channel={c} />} />
        ))}
      </ListOrGrid>
    );
  } else {
    return <RecentChannels setRootSearchText={setSearchText} isLoading={isLoading} />;
  }
}
