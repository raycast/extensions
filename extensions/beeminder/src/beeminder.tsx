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
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import moment from "moment";
import { Goal, GoalResponse, DataPointFormValues, Preferences } from "./types";
import { fetchGoals, sendDatapoint } from "./api";
import { useEffect, useState } from "react";

const cache = new Cache();

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);

  const [goals, setGoals] = useState<GoalResponse | undefined>(() => {
    const cachedGoals = cache.get("goals");
    return cachedGoals ? JSON.parse(cachedGoals) : undefined;
  });

  function fetchData() {
    return fetchGoals()
      .then((data) => {
        // When the data changes, update the cache
        cache.set("goals", JSON.stringify(data));
        setGoals(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
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
    const { handleSubmit, itemProps } = useForm<DataPointFormValues>({
      async onSubmit(values) {
        try {
          await sendDatapoint(goalSlug, values.dataPoint, values.comment);
          popToRoot();
          await showToast({
            style: Toast.Style.Success,
            title: "Datapoint submitted",
            message: "Your datapoint was submitted successfully",
          });
        } catch (error) {
          popToRoot();
          await showToast({
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
      return moment().startOf("day").unix();
    };

    const getGoalIcon = (dayDifference: number) => {
      if (colorProgression === "rainbow") {
        if (dayDifference < 1) return "🔴";
        if (dayDifference < 2) return "🟠";
        if (dayDifference < 3) return "🟡";
        if (dayDifference < 7) return "🟢";
        if (dayDifference < 14) return "🔵";
        return "🟣";
      } else {
        if (dayDifference < 1) return "🔴";
        if (dayDifference < 2) return "🟠";
        if (dayDifference < 3) return "🔵";
        return "🟢";
      }
    };

    return (
      <List isLoading={isLoading}>
        {goals?.map((goal: Goal) => {
          const diff = moment.unix(goal.losedate).diff(new Date());
          const timeDiffDuration = moment.duration(diff);
          const dayDifference = moment.unix(goal.losedate).diff(new Date(), "days");
          const goalRate = goal.baremin;

          const goalIcon = getGoalIcon(dayDifference);
          let dueText = `${goalRate} ${goal.gunits} due in `;
          if (dayDifference > 1) {
            dueText += `${dayDifference} days`;
          } else if (dayDifference === 1) {
            dueText += `${dayDifference} day`;
          }

          if (dayDifference < 1) {
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
                    target={<DataPointForm goalSlug={goal.slug} />}
                  />
                  <Action.OpenInBrowser
                    title="Open goal in Beeminder"
                    url={`https://www.beeminder.com/${beeminderUsername}/${goal.slug}`}
                  />
                  <Action title="Refresh data" onAction={async () => await fetchData()} />
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