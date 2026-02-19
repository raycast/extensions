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
  getSuhoorTime,
  formatTime,
  getTimeRemaining,
  getTimeRemainingTomorrow,
} from "./utils";

export default function SuhoorCommand() {
  const [time, setTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getTodayTimings();
        const suhoor = getSuhoorTime(result.data.timings.Fajr);
        setTime(suhoor);

        const remaining = getTimeRemaining(suhoor);
        await updateCommandMetadata({
          subtitle: remaining
            ? formatTime(suhoor)
            : `${formatTime(suhoor)} (tomorrow)`,
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load Suhoor time",
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
        <List.EmptyView
          title="Could not load Suhoor time"
          icon={Icon.Warning}
        />
      </List>
    );
  }

  const remaining = getTimeRemaining(time);
  const hasPassed = !remaining;
  const countdown = hasPassed ? getTimeRemainingTomorrow(time) : remaining;

  return (
    <List>
      <List.Item
        icon={{ source: Icon.Moon, tintColor: Color.Purple }}
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
