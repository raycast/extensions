import { List, showToast, ToastStyle } from "@raycast/api";

import { StoryListItem } from "./StoryListItem";
import useHNRss from "./useHNRss";

export default function Command() {
  const state = useHNRss("frontpage");

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading stories", state.error.message);
  }

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}
