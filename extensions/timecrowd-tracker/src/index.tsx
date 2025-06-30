import { List, Action, ActionPanel, Icon } from "@raycast/api";
import dayjs from "dayjs";

import { useDailyActivities, useUser } from "@/hooks";
import { DailySection } from "@/components/DailySection";
import { RunningTimeEntry } from "@/components/RunningTimeEntry";
import { CreateTimeEntry } from "@/components/CreateTimeEntry";

export default function StartStopTimeEntry() {
  const today = dayjs();
  const weeklyDates = Array.from({ length: 7 }, (_, i) => today.subtract(i, "day"));

  const { isLoadingUser, user, revalidateUser } = useUser();
  const { isLoadingDailyActivities, dailyActivities, revalidateDailyActivities } = useDailyActivities(weeklyDates);

  return (
    <List isLoading={isLoadingUser && isLoadingDailyActivities}>
      {user?.time_entry && (
        <RunningTimeEntry
          timeEntry={user.time_entry}
          revalidateDailyActivities={revalidateDailyActivities}
          revalidateUser={revalidateUser}
        />
      )}
      <List.Section title="Actions">
        <List.Item
          icon={{
            source: Icon.Plus,
          }}
          title="Create a new time entry"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Time Entry"
                target={
                  <CreateTimeEntry
                    revalidateUser={revalidateUser}
                    revalidateDailyActivities={revalidateDailyActivities}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {dailyActivities?.map((dailyActivity) => (
        <DailySection key={dailyActivity.date} dailyActivity={dailyActivity} revalidateUser={revalidateUser} />
      ))}
    </List>
  );
}
