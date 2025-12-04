import { List } from "@raycast/api";
import { HistoryItem } from "../types";
import HistoryListItem from "./HistoryListItem";

export default function HistoryListSection(props: { title: string; entries?: HistoryItem[]; searchText?: string }) {
  return (
    <List.Section title={props.title}>
      {props.entries?.map((tab) => <HistoryListItem key={tab.id} entry={tab} searchText={props.searchText} />)}
    </List.Section>
  );
}
