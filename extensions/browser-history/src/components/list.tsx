import { List } from "@raycast/api";
import { Actions } from "./index";
import { HistoryEntry } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export const HistoryListEntry = ({ entry: { url, title, id, lastVisited } }: { entry: HistoryEntry }) => (
  <List.Item
    id={id.toString()}
    title={title || ""}
    subtitle={url}
    icon={getFavicon(url)}
    actions={<Actions.HistoryItem entry={{ url, title, id, lastVisited }} />}
  />
);
