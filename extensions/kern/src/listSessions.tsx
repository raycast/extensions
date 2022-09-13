import { ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { DeleteRecordAction } from "./components/deleteRecord";
import { readableDuration, groupByDate, log } from "./utilities";
import type { Session } from "./types";
import { getMostRecentSession, getSessions, setAllSessions } from "./store";

const Command = () => {
  const [sessionRecords, setSessionRecords] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runningToast, setRunningToast] = useState<Toast | undefined>(undefined);

  /** Helper to ignore first render */
  const firstRender = useRef(true);

  useEffect(() => {
    (async () => {
      /** Get all session */
      const { data, error } = await getSessions();

      if (error) log("error", "Could not get session.");
      if (data) {
        setIsLoading(false);
        setSessionRecords(data);

        /** Show a Toast when a session is runnig. */
        /** TODO: This is not reactive at the moment. */
        const { data: recentSession } = await getMostRecentSession();

        if (recentSession && !recentSession.endTime) {
          setRunningToast(
            await showToast({
              style: Toast.Style.Animated,
              title: "A session is running",
              primaryAction: {
                title: "Pause Session",
                onAction: () => {
                  //TODO: Session should be paused.
                  log("warn", "Session should be paused!");
                },
              },
            })
          );
        } else if (runningToast) {
          /** Hide the Toast if no session is running. */
          await runningToast.hide();
        }
      }
    })();
  }, []);

  useEffect(() => {
    !firstRender.current && setAllSessions(sessionRecords);

    firstRender.current = false;
  }, [sessionRecords]);

  return (
    <List isLoading={isLoading}>
      {sessionRecords?.length === 0 ? (
        <List.EmptyView title="No records"></List.EmptyView>
      ) : (
        Object.entries(groupByDate(sessionRecords)).map(([date, _sessionRecords]) => (
          <List.Section title={date} key={date}>
            {_sessionRecords.map((sessionRecord) => (
              <List.Item
                title={sessionRecord.name ?? "Focus Session"}
                subtitle={`${readableDuration(sessionRecord.duration || 0)} - Started at ${new Date(
                  sessionRecord.startTime
                ).toLocaleTimeString()}`}
                icon={Icon.Clock}
                key={sessionRecord.startTime}
                actions={
                  <ActionPanel>
                    <DeleteRecordAction state={[sessionRecords, setSessionRecords]} id={sessionRecord.id} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
};

export default Command;
