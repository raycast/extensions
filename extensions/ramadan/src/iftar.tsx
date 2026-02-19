import {
  List,
  Icon,
  Color,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getTodayTimings } from "./api";
import {
  getIftarTime,
  formatTime,
  getTimeRemaining,
  getTimeRemainingTomorrow,
} from "./utils";

export default function IftarCommand() {
  const [time, setTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getTodayTimings();
        const iftar = getIftarTime(result.data.timings.Maghrib);
        setTime(iftar);

        const remaining = getTimeRemaining(iftar);
        await updateCommandMetadata({
          subtitle: remaining
            ? formatTime(iftar)
            : `${formatTime(iftar)} (tomorrow)`,
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load Iftar time",
          message: String(error),
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <List isLoading />;
  if (!time) {
    return (
      <List>
        <List.EmptyView title="Could not load Iftar time" icon={Icon.Warning} />
      </List>
    );
  }

  const remaining = getTimeRemaining(time);
  const hasPassed = !remaining;
  const countdown = hasPassed ? getTimeRemainingTomorrow(time) : remaining;

  return (
    <List>
      <List.Item
        icon={{ source: Icon.Sun, tintColor: Color.Orange }}
        title="Time"
        accessories={[
          {
            text: hasPassed
              ? `${formatTime(time)} (tomorrow)`
              : formatTime(time),
          },
        ]}
      />
      <List.Item
        icon={{ source: Icon.Clock, tintColor: Color.Blue }}
        title="Countdown"
        accessories={[{ text: `in ${countdown.text}` }]}
      />
    </List>
  );
}
