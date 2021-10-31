import { List, showToast, ToastStyle } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage } from "../lib/utils";
import { Channel, searchChannels, useRefresher } from "../lib/youtubeapi";
import { ChannelListItem } from "./channel";

export function SearchChannelList() {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useRefresher<Channel[] | undefined>(async () => {
    if (searchText) {
      return await searchChannels(searchText);
    }
    return undefined;
  }, [searchText]);
  if (error) {
    showToast(ToastStyle.Failure, "Could not search videos", getErrorMessage(error));
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle={true}>
      {data?.map((c) => (
        <ChannelListItem key={c.id} channel={c} />
      ))}
    </List>
  );
}
