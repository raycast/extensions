import {
  List,
  ActionPanel,
  Action,
  popToRoot,
  showToast,
  Toast,
  Form,
  getPreferenceValues,
  Cache,
  Icon,
  Keyboard,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import moment from "moment";
import { Goal, GoalResponse, DataPointFormValues, Preferences } from "./types";
import { fetchGoals, sendDatapoint } from "./api";
import { useEffect, useState } from "react";
import { useNavigation } from "@raycast/api";

const cache = new Cache();

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);

  const [goals, setGoals] = useState<GoalResponse | undefined>(() => {
    const cachedGoals = cache.get("goals");
    return cachedGoals ? JSON.parse(cachedGoals) : undefined;
  });

  // Fetch goals with an optional delay. A delay is necessary after a datapoint
  // submission because Beeminder takes some time to update the goal with new
  // values based on the datapoint.
  async function fetchData(delay = 0) {
    setIsLoading(true);
    try {
      const fetchAndSetGoals = async () => {
        const data = await fetchGoals();
        cache.set("goals", JSON.stringify(data));
        setGoals(data as GoalResponse);
      };

      // Always perform an initial fetch
      const initialFetch = fetchAndSetGoals();

      // If delay > 0, perform a second fetch after the delay
      const delayedFetch =
        delay > 0
          ? new Promise((resolve) => setTimeout(resolve, delay)).then(fetchAndSetGoals)
          : Promise.resolve();

      // Wait for both fetches to complete
      await Promise.all([initialFetch, delayedFetch]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // error handling
  if (!Array.isArray(goals) && goals?.errors) {
    if (goals.errors.auth_token === "bad_token") {
      showToast({
        style: Toast.Style.Failure,
        title: "Bad Auth Token",
        message: "Please check your auth token in the extension preferences.",
      });
      popToRoot();
    }

    if (goals.errors.token === "no_token") {
      showToast({
        style: Toast.Style.Failure,
        title: "No Auth Token",
        message: "Please set your auth token in the extension preferences.",
      });
      popToRoot();
    }
  }

  function DataPointForm({ goalSlug }: { goalSlug: string }) {
    const { pop } = useNavigation();
    const { handleSubmit, itemProps } = useForm<DataPointFormValues>({
      async onSubmit(values) {
        try {
          await sendDatapoint(goalSlug, values.dataPoint, values.comment);
          showToast({
            style: Toast.Style.Success,
            title: "Datapoint submitted",
            message: "Your datapoint was submitted successfully",
          });
          pop();
          fetchData(2000);
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Something went wrong",
            message: "Failed to send your datapoint",
          });
        }
      },
      validation: {
        dataPoint: (value) => {
          if (value && isNaN(Number(value))) {
            return "This field should be a number";
          } else if (!value) {
            return "The field is required";
          }
        },
      },
    });

    return (
      <Form
        navigationTitle={`Add a datapoint for goal "${goalSlug}"`}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          title="Datapoint"
          autoFocus
          placeholder={`Enter datapoint for ${goalSlug}`}
          {...itemProps.dataPoint}
        />
        <Form.TextField id="comment" title="Comment" defaultValue="Sent from Raycast 🐝" />
      </Form>
    );
  }

  function GoalsList({ goalsData }: { goalsData: GoalResponse }) {
    const { beeminderUsername, colorProgression, showDaysAboveLine, sortByDaysAboveLine } =
      getPreferenceValues<Preferences>();
    const goals = Array.isArray(goalsData) ? goalsData : undefined;

    const getCurrentDayStart = () => {
      return new Date().setHours(0, 0, 0, 0) / 1000; // Convert to Unix timestamp
    };

    const getDailyRate = (rate: number, runits: string) => {
      switch (runits) {
        case "y":
          return rate / 365;
        case "m":
          return rate / 30;
        case "w":
          return rate / 7;
        case "h":
          return rate * 24;
        case "d":
        default:
          return rate;
      }
    };

    const getDaysAboveLine = (goal: Goal) => {
      const dailyRate = getDailyRate(goal.rate, goal.runits);
      return Math.floor(goal.delta / dailyRate + 1);
    };

    const getGoalIcon = (safebuf: number, daysAbove: number) => {
      const value = sortByDaysAboveLine ? daysAbove : safebuf;
      if (!Number.isFinite(value)) return "🟣";
      if (colorProgression === "rainbow") {
        if (value < 1) return "🔴";
        if (value < 2) return "🟠";
        if (value < 3) return "🟡";
        if (value < 7) return "🟢";
        if (value < 14) return "🔵";
        return "🟣";
      } else {
        if (value < 1) return "🔴";
        if (value < 2) return "🟠";
        if (value < 3) return "🔵";
        return "🟢";
      }
    };

    // Sort goals by days above line if the preference is enabled
    const sortedGoals = goals
      ? [...goals].sort((a, b) => {
          if (sortByDaysAboveLine) {
            const aDaysAbove = getDaysAboveLine(a);
            const bDaysAbove = getDaysAboveLine(b);
            if (!Number.isFinite(aDaysAbove) && !Number.isFinite(bDaysAbove)) return 0;
            if (!Number.isFinite(aDaysAbove) || !Number.isFinite(bDaysAbove)) {
              return Number.isFinite(aDaysAbove) ? -1 : 1; // Place non-finite numbers at the end
            }
            return aDaysAbove - bDaysAbove; // Sort in ascending order
          }
          return 0;
        })
      : goals;

    return (
      <List isLoading={isLoading}>
        {sortedGoals?.map((goal: Goal) => {
          const diff = moment.unix(goal.losedate).diff(new Date());
          const timeDiffDuration = moment.duration(diff);
          const goalRate = goal.baremin;

          const goalIcon = getGoalIcon(goal.safebuf, getDaysAboveLine(goal));
          let dueText = `${goalRate} ${goal.gunits} due in `;
          if (goal.safebuf > 1) {
            dueText += showDaysAboveLine ? `${goal.safebuf}d` : `${goal.safebuf} days`;
          } else if (goal.safebuf === 1) {
            dueText += showDaysAboveLine ? `${goal.safebuf}d` : `${goal.safebuf} day`;
          }

          if (goal.safebuf < 1) {
            const hours = timeDiffDuration.hours();
            const minutes = timeDiffDuration.minutes();

            if (showDaysAboveLine) {
              if (hours > 0) {
                dueText += `${hours}h`;
              }
              if (minutes > 0) {
                dueText += `${minutes}m`;
              }
            } else {
              if (hours > 0) {
                dueText += `${hours} ${hours > 1 ? "hours" : "hour"}`;
              }
              if (minutes > 0) {
                if (hours > 0) dueText += " ";
                dueText += `${minutes} ${minutes > 1 ? "minutes" : "minute"}`;
              }
            }
          }

          if (showDaysAboveLine) {
            const daysAbove = getDaysAboveLine(goal);
            if (Number.isFinite(daysAbove)) {
              dueText += ` (${daysAbove}d above line)`;
            }
          }

          const hasDataForToday =
            goal.last_datapoint && goal.last_datapoint.timestamp >= getCurrentDayStart();

          return (
            <List.Item
              key={goal.slug}
              title={goal.slug}
              subtitle={`Pledged $${goal.pledge}`}
              icon={
                hasDataForToday
                  ? { value: Icon.Checkmark, tooltip: "Data entered today" }
                  : undefined
              }
              accessories={[
                {
                  text: dueText,
                },
                {
                  icon: goalIcon,
                },
              ]}
              keywords={goal.title
                .split(" ")
                .map((word) => word.replace(/[^\w\s]/g, ""))
                .filter((word) => word !== "")}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Enter datapoint"
                    icon={Icon.PlusCircle}
                    target={<DataPointForm goalSlug={goal.slug} />}
                  />
                  <Action.OpenInBrowser
                    title="Open goal in Beeminder"
                    url={`https://www.beeminder.com/${beeminderUsername}/${goal.slug}`}
                  />
                  <Action
                    title="Refresh data"
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    icon={Icon.RotateClockwise}
                    onAction={fetchData}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List>
    );
  }

  return <GoalsList goalsData={goals} />;
}
