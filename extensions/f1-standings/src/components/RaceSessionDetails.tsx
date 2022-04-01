import { List } from "@raycast/api";
import { formatDate } from "../utils";

const dateParagraph = (title: string, date: Date) => {
  return `#### ${title}
${formatDate(date)}`;
};

function RaceSessionDetails({ raceDates }: { raceDates: [string, Date][] }) {
  return <List.Item.Detail markdown={raceDates.map(([title, date]) => dateParagraph(title, date)).join("\n")} />;
}

export default RaceSessionDetails;
