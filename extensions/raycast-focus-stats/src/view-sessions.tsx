import type { Session } from "./types";
import { List, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSessionsByDate } from "./sessions";
import { formatTime } from "./utils";
import { useState } from "react";
import { DateDropdown } from "./components/date-dropdown";
import { InitWrapper } from "./components/init/init-wrapper";
import { durationString } from "./utils";

const SessionListItem = ({ session }: { session: Session }) => {
  const { goal, start, duration } = session;
  const subtitle = formatTime(start);

  return (
    <List.Item
      key={subtitle}
      title={goal || ""}
      subtitle={subtitle}
      accessories={[{ tag: { value: durationString(duration || 0), color: Color.Green } }]}
    />
  );
};

export default function Command() {
  const [date, setDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);

  const { isLoading } = usePromise(
    async (date: Date) => {
      setSessions(getSessionsByDate(date));
    },
    [date],
  );

  // When date changes, update the date on the component's state, causing a
  // re-render and the recalculation of the `sessions` variable.
  const onDateChange = (date: Date) => setDate(date);

  return (
    <InitWrapper>
      <List isLoading={isLoading} searchBarAccessory={<DateDropdown onDateChange={onDateChange} />}>
        {sessions?.map((session, index) => <SessionListItem key={index} session={session} />)}
      </List>
    </InitWrapper>
  );
}
