import type { Session } from "./types";
import { List, Color } from "@raycast/api";
import { getSessionsByDate } from "./sessions";
import { formatTime } from "./utils";
import { JSX, useState, useMemo } from "react";
import { DateDropdown } from "./components/date-dropdown";
import { usePromise } from "@raycast/utils";
import { durationString, sessionString } from "./utils";
import { InitWrapper } from "./components/init/init-wrapper";

export default function Command() {
  const [date, setDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);

  const entries = useMemo(() => {
    const summary = sessions.reduce(
      (acc, session) => {
        const goal = session.goal;
        acc[goal] = acc[goal] || [];
        acc[goal].push(session);
        return acc;
      },
      {} as Record<string, Session[]>,
    );

    // Sort sessions to ensure that earlier sessions are displayed first.
    return Object.entries(summary).sort(([goalA], [goalB]) => goalA.localeCompare(goalB));
  }, [sessions]);

  // When date changes, update the date on the component's state, causing a
  // re-render and the recalculation of the `sessions` and `entries` variable.
  const onDateChange = (date: Date) => setDate(date);

  return (
    <InitWrapper
      children={(initialized) => {
        const { isLoading } = usePromise(
          async (date: Date) => {
            return setSessions(getSessionsByDate(date));
          },
          [date],
          // Only execute the function inside `usePromise` when `initialized` is
          // true. This prevents the component from trying to fetch the sessions
          // from the database, before even checking if the database has been
          // initialized and migrations run.
          { execute: initialized },
        );

        return (
          <List
            isLoading={!initialized || isLoading}
            isShowingDetail
            searchBarAccessory={<DateDropdown onDateChange={onDateChange} />}
          >
            {/* Summary of all sessions for the day. */}
            {sessions.length > 0 && <SummaryListItem title={"Summary"} sessions={sessions} displayGoal={true} />}

            <List.Section title="Breakdown">
              {entries.map(([goal, sessions]) => (
                <SummaryListItem key={goal} title={goal} sessions={sessions} />
              ))}
            </List.Section>
          </List>
        );
      }}
    />
  );
}

/**
 * Props for the SessionSummaryListItem component.
 *
 * @property {string} title - The title to display for the session summary item.
 * @property {Session[]} sessions - An array of Session objects to summarize.
 * @property {boolean} [displayGoal=false] - Whether to display the session's goal for
 * session in the "Session Breakdown" section. Defaults to false.
 */
type SummaryListItemProps = {
  title: string;
  sessions: Session[];
  displayGoal?: boolean;
};

/**
 * Renders a summary list item for a group of sessions.
 *
 * Displays the total duration of all sessions, the number of sessions, and a
 * breakdown of each session.
 * Optionally displays the goal for each session if `displayGoal` is true.
 *
 * @param {SummaryListItemProps} props - The props for the component.
 * @returns {JSX.Element} The rendered list item component.
 */
function SummaryListItem(props: SummaryListItemProps): JSX.Element {
  const { title, sessions, displayGoal = false } = props;
  const totalDuration = sessions.reduce((acc, session) => acc + (session.duration ?? 0), 0);

  const tagListTitle = (session: Session) => {
    return displayGoal ? `${session.goal}  ${formatTime(session.start)}` : formatTime(session.start);
  };

  return (
    <List.Item
      key={title}
      title={title}
      accessories={[{ tag: sessions.length.toString(), tooltip: `${sessionString(sessions.length)}` }]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Total" text={durationString(totalDuration)} />

              <List.Item.Detail.Metadata.Label title="" />

              <List.Item.Detail.Metadata.Label title="Session Breakdown" />
              <List.Item.Detail.Metadata.Separator />
              {sessions.map((session) => (
                <List.Item.Detail.Metadata.TagList key={session.start.toISOString()} title={tagListTitle(session)}>
                  <List.Item.Detail.Metadata.TagList.Item
                    text={durationString(session.duration || 0)}
                    key={`taglistitemduration-${session.goal}`}
                    color={Color.Green}
                  />
                </List.Item.Detail.Metadata.TagList>
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
