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
    const { beeminderUsername, colorProgression } = getPreferenceValues<Preferences>();
    const goals = Array.isArray(goalsData) ? goalsData : undefined;

    const getCurrentDayStart = () => {
      return new Date().setHours(0, 0, 0, 0) / 1000; // Convert to Unix timestamp
    };

    const getGoalIcon = (safebuf: number) => {
      if (colorProgression === "rainbow") {
        if (safebuf < 1) return "🔴";
        if (safebuf < 2) return "🟠";
        if (safebuf < 3) return "🟡";
        if (safebuf < 7) return "🟢";
        if (safebuf < 14) return "🔵";
        return "🟣";
      } else {
        if (safebuf < 1) return "🔴";
        if (safebuf < 2) return "🟠";
        if (safebuf < 3) return "🔵";
        return "🟢";
      }
    };

    return (
      <List isLoading={isLoading}>
        {goals?.map((goal: Goal) => {
          const diff = moment.unix(goal.losedate).diff(new Date());
          const timeDiffDuration = moment.duration(diff);
          const goalRate = goal.baremin;

          const goalIcon = getGoalIcon(goal.safebuf);
          let dueText = `${goalRate} ${goal.gunits} due in `;
          if (goal.safebuf > 1) {
            dueText += `${goal.safebuf} days`;
          } else if (goal.safebuf === 1) {
            dueText += `${goal.safebuf} day`;
          }

          if (goal.safebuf < 1) {
            const hours = timeDiffDuration.hours();
            const minutes = timeDiffDuration.minutes();
            if (hours > 0) {
              dueText += hours > 1 ? `${hours} hours` : `${hours} hour`;
            }
            if (minutes > 0) {
              dueText += minutes > 1 ? ` ${minutes} minutes` : ` ${minutes} minute`;
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
