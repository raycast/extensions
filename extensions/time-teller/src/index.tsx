import { useEffect, useState } from "react";
import { Action, ActionPanel, List, AI, popToRoot, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { setTimeout } from "timers/promises";

interface Timeframe {
  startDate: string | undefined;
  endDate: string | undefined;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>({ startDate: undefined, endDate: undefined });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetches and processes date information from the AI based on the current input text.
   *
   * This effect is triggered whenever the search text changes. It waits for 0.8 seconds before
   * querying the AI to avoid being rate limited. The AI's response is expected to be in the
   * format "startDate: YYYY-MM-DDTHH:MM:SSZ, endDate: YYYY-MM-DDTHH:MM:SSZ".
   *
   * The response is then parsed into a timeframe object, which is used to update the component's state.
   */
  useEffect(() => {
    /**
     * Checks if the input text is not empty before proceeding with the data fetching process.
     * This condition ensures that unnecessary requests are not sent to the AI when the input text is empty.
     */
    if (searchText !== "") {
      const fetchData = async () => {
        setIsLoading(true);
        await setTimeout(800);

        const aiPrompt = `translate the date and give only a direct answer with the current date and the date in the text, or between the two dates in the text, format in ISO 8601 and give a string with start and end dates like "startDate: 2024-10-05T13:00:00Z, endDate: 2024-10-06T22:00:00Z": ${searchText}`;

        try {
          const answer = await AI.ask(aiPrompt, {});
          const dates = answer.split(", ");
          const dateObject = dates.reduce((acc: Timeframe, date) => {
            const [key, value] = date.split(": ");
            acc[key as keyof Timeframe] = value;
            return acc;
          }, {} as Timeframe);

          setTimeframe(dateObject);
        } catch (err: unknown) {
          if (err instanceof Error) {
            if (err.message === "Process cancelled") {
              popToRoot();
            } else {
              showFailureToast(err);
            }
          }
        }

        setIsLoading(false);
      };
      fetchData();
    }
  }, [searchText]);

  function calculateTimeframes(startDate: Date, endDate: Date) {
    // Convert the input dates to date objects if they are not already
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate the difference in milliseconds, seconds, minutes, hours, and days
    const diffInMilliseconds = end.getTime() - start.getTime();
    const diffInSeconds = diffInMilliseconds / 1000;
    const diffInMinutes = diffInSeconds / 60;
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    // Return a object with the timeframes
    return {
      milliseconds: diffInMilliseconds,
      seconds: diffInSeconds,
      minutes: diffInMinutes,
      hours: diffInHours,
      days: diffInDays,
    };
  }

  const timeframes =
    timeframe.startDate && timeframe.endDate
      ? calculateTimeframes(new Date(timeframe.startDate), new Date(timeframe.endDate))
      : calculateTimeframes(new Date(), new Date());

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Write a date or a time period"
      throttle={true}
      isLoading={isLoading}
    >
      <List.EmptyView icon={Icon.Clock} title="Waiting for input" description="Type a specific date or a time period" />

      {timeframe.startDate !== undefined && (
        <>
          <List.Item
            title={timeframe.startDate ?? "No start date detected"}
            accessories={[{ text: "ISO 8601" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={timeframe.startDate ?? ""} />
              </ActionPanel>
            }
          />
          <List.Item
            title={timeframe.endDate ?? "No end date detected"}
            accessories={[{ text: "ISO 8601" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={timeframe.endDate ?? ""} />
              </ActionPanel>
            }
          />
          <List.Item
            title={timeframes.milliseconds.toString()}
            accessories={[{ text: "Milliseconds" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={timeframes.milliseconds.toString()} />
              </ActionPanel>
            }
          />
          <List.Item
            title={timeframes.seconds.toString()}
            accessories={[{ text: "Seconds" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={timeframes.seconds.toString()} />
              </ActionPanel>
            }
          />
          <List.Item
            title={timeframes.minutes.toString()}
            accessories={[{ text: "Minutes" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={timeframes.minutes.toString()} />
              </ActionPanel>
            }
          />
          <List.Item
            title={timeframes.hours.toString()}
            accessories={[{ text: "Hours" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={timeframes.hours.toString()} />
              </ActionPanel>
            }
          />
          <List.Item
            title={timeframes.days.toString()}
            accessories={[{ text: "Days" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={timeframes.days.toString()} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
