import { List } from "@raycast/api";
import dayjs from "dayjs";
import { TaskDetail } from "@/components/TaskDetail";
import type { DailyActivity } from "@/api/dailyActivity";

interface DailySectionProps {
  dailyActivity: DailyActivity;
  revalidateUser: () => void;
}

export const DailySection = ({ dailyActivity, revalidateUser }: DailySectionProps) => {
  const totalTime = `${String(dailyActivity?.total.hours).padStart(2, "0")}:${String(dailyActivity?.total.minutes).padStart(2, "0")}`;
  const date = dayjs(dailyActivity.date);

  return (
    <List.Section title={date.format("YYYY-MM-DD(ddd)")} subtitle={totalTime}>
      {dailyActivity?.tasks.map((task) => <TaskDetail key={task.id} task={task} revalidateUser={revalidateUser} />)}
    </List.Section>
  );
};
