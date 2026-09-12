import { useState } from "react";
import { LoggedMonth } from "./domain/loggedDay/LoggedMonth";
import { List } from "@raycast/api";
import { getLoggedMonthsUseCaseFactory } from "./factories/getLoggedMonthsUseCaseFactory";
import { getDailyLogsForMonthUseCaseFactory } from "./factories/getDailyLogsForMonthUseCaseFactory";
import { useAI } from "@raycast/utils";

export default function Command() {
  const [items] = useState<LoggedMonth[]>(getLoggedMonthsUseCaseFactory().execute());

  return (
    <List isShowingDetail>
      {items.map((item) => (
        <List.Item key={item.date.toISOString()} title={item.title} detail={<Detail date={item.date} />} />
      ))}
    </List>
  );

  function Detail(props: { date: Date }) {
    const dailyLogs = getDailyLogsForMonthUseCaseFactory().execute(props.date);
    const monthTitle = props.date.toLocaleDateString("en-US", { month: "long" });
    const { isLoading, data } = useAI(
      dailyLogs.reduce((acc, item) => {
        return acc + `${item.title}\n`;
      }, `Was I productive? Make a quick summary gruping the core things I've worked on whole month of ${monthTitle}, ${props.date.getFullYear()}, based on this list:\n\n`)
    );

    return <List.Item.Detail isLoading={isLoading} markdown={data} />;
  }
}
