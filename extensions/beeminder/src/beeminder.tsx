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
  Color,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import moment from "moment";
import { Goal, GoalResponse, DataPointFormValues, Preferences } from "./types";
import { fetchGoals, sendDatapoint } from "./api";
import { useEffect, useState, useMemo } from "react";
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

  function DataPointForm({
    goalSlug,
    lastDatapoint,
  }: {
    goalSlug: string;
    lastDatapoint?: number;
  }) {
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
          placeholder={
            lastDatapoint !== undefined
              ? `Last datapoint: ${lastDatapoint}`
              : `Enter datapoint for ${goalSlug}`
          }
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

    const getGoalColor = (value: number): Color => {
      if (!Number.isFinite(value)) return Color.Purple;
      if (colorProgression === "rainbow") {
        if (value < 1) return Color.Red;
        if (value < 2) return Color.Orange;
        if (value < 3) return Color.Yellow;
        if (value < 7) return Color.Green;
        if (value < 14) return Color.Blue;
        return Color.Purple;
      } else {
        if (value < 1) return Color.Red;
        if (value < 2) return Color.Orange;
        if (value < 3) return Color.Blue;
        return Color.Green;
      }
    };

    const getEmoji = (color: Color): string => {
      if (color === Color.Purple) return "🟣";
      if (color === Color.Red) return "🔴";
      if (color === Color.Orange) return "🟠";
      if (color === Color.Yellow) return "🟡";
      if (color === Color.Green) return "🟢";
      if (color === Color.Blue) return "🔵";
      return "🟣";
    };

    const sortedGoals = useMemo(() => {
      return goals
        ? [...goals].sort((a, b) => {
            if (sortByDaysAboveLine) {
              const aDaysAbove = getDaysAboveLine(a);
              const bDaysAbove = getDaysAboveLine(b);
              if (!Number.isFinite(aDaysAbove) && !Number.isFinite(bDaysAbove)) return 0;
              if (!Number.isFinite(aDaysAbove) || !Number.isFinite(bDaysAbove)) {
                return Number.isFinite(aDaysAbove) ? -1 : 1;
              }
              return aDaysAbove - bDaysAbove;
            }
            return 0;
          })
        : goals;
    }, [goals, sortByDaysAboveLine]);

    return (
      <List isLoading={isLoading}>
        {sortedGoals?.map((goal: Goal) => {
          const diff = moment.unix(goal.losedate).diff(new Date());
          const timeDiffDuration = moment.duration(diff);
          const goalRate = goal.baremin;
          const dueText = `${goalRate} ${goal.gunits} due`;
          const daysAbove = getDaysAboveLine(goal);
          const sortValue = sortByDaysAboveLine ? daysAbove : goal.safebuf;
          const emoji = getEmoji(getGoalColor(sortValue));
          let dayAmount = `${goal.safebuf}d`;

          if (goal.safebuf < 1) {
            const hours = timeDiffDuration.hours();
            const minutes = timeDiffDuration.minutes();

            if (hours > 0) {
              dayAmount += `${hours}h`;
            }
            if (minutes > 0) {
              dayAmount += `${minutes}m`;
            }
          }

          const hasDataForToday =
            goal.last_datapoint && goal.last_datapoint.timestamp >= getCurrentDayStart();

          const accessories: List.Item.Accessory[] = [
            {
              text: dueText,
            },
            {
              tag: {
                value: dayAmount,
                color: getGoalColor(goal.safebuf),
              },
            },
          ];
          if (showDaysAboveLine && Number.isFinite(daysAbove)) {
            accessories.push({
              tag: {
                value: `${daysAbove}d delta`,
                color: getGoalColor(daysAbove),
              },
            });
          }
          accessories.push({
            icon: emoji,
          });

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
              accessories={accessories}
              keywords={goal.title
                .split(" ")
                .map((word) => word.replace(/[^\w\s]/g, ""))
                .filter((word) => word !== "")}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Enter datapoint"
                    icon={Icon.PlusCircle}
                    target={
                      <DataPointForm
                        goalSlug={goal.slug}
                        lastDatapoint={goal.last_datapoint?.value}
                      />
                    }
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
