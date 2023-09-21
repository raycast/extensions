import { List } from "@raycast/api";
import View from "./components/view";
import { getCalendarClient } from "./lib/withCalendarClient";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

function RootCommand() {
  const { calendar } = getCalendarClient();
  const [searchText, setSearchText] = useState<string>("");
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (q: string) => {
      const r = await calendar.calendarList.list();
      const calIds = r.data.items?.map((c) => c.id).filter((c) => c) as string[] | undefined;
      if (calIds) {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        const res = await Promise.all(
          calIds.map((c) =>
            calendar.events.list({ calendarId: c, timeMin: new Date().toISOString(), timeMax: maxDate.toISOString() })
          )
        );
        return res;
      }
    },
    [searchText],
    { keepPreviousData: true }
  );
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchText={searchText}>
      {data?.map((c) => c.data.items?.map((item) => <List.Item key={item.id} title={item.summary || "?"} />))}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <RootCommand />
    </View>
  );
}
