import { List, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";

import { StoryListItem } from "./StoryListItem";
import useHNRss from "./useHNRss";

export default function Command() {
  const state = useHNRss("frontpage");

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading stories",
        message: state.error.message,
      });
    }
  }, [state.error]);

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}
