import { List } from "@raycast/api";
import { HistoryItem } from "../types";
import HistoryListItem from "./HistoryListItem";

const HistoryListSection = (props: { title: string; entries?: HistoryItem[]; searchText?: string }) => {
  return (
    <List.Section title={props.title}>
      {props.entries?.map((item) => <HistoryListItem key={item.id} entry={item} searchText={props.searchText} />)}
    </List.Section>
  );
};

export default HistoryListSection;
