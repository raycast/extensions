import { List } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export default function NextDueDate({ date }: { date: string }) {
  return <List.Item.Detail.Metadata.Label title="Next due date" text={`${dayjs(date).fromNow(true)} from now`} />;
}
