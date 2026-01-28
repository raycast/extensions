import { useState } from "react";
import { LoggedDay } from "./domain/loggedDay/LoggedDay";
import { getDailyLogsForDateUseCaseFactory } from "./factories/getDailyLogsForDateUseCaseFactory";
import { getLoggedDaysuseCaseFactory } from "./factories/getLoggedDaysuseCaseFactory";
import { List } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function Command() {
  const [items] = useState<LoggedDay[]>(getLoggedDaysuseCaseFactory().execute());

  return (
    <List isShowingDetail>
      {items.map((item) => (
        <List.Item key={item.date.toISOString()} title={item.title} detail={<Detail date={item.date} />} />
      ))}
    </List>
  );

  function Detail(props: { date: Date }) {
    const dailyLogs = getDailyLogsForDateUseCaseFactory().execute(props.date);
    const { isLoading, data } = useAI(
      dailyLogs.reduce((acc, item) => {
        return acc + `${item.title}\n`;
      }, `Summarise what I've done on a day, based on this list:\n\n`)
    );

    return <List.Item.Detail isLoading={isLoading} markdown={data} />;
  }
}
