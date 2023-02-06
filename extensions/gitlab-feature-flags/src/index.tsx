import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import FlagItem from "./components/FlagItem";
import { FLAGS_URL } from "./CONSTANTS";

import { Flag } from "./types";

export default function Command() {
  const { isLoading, data: flags }: { isLoading: boolean; data: [Flag] | undefined } = useFetch(FLAGS_URL);
  
  return (
    <List isShowingDetail isLoading={isLoading}>
      {flags?.map((flag) => FlagItem(flag))}
    </List>
  );
}
