import { List, ActionPanel, Action, popToRoot, showToast, Toast, Form } from "@raycast/api";
import { usePromise, useForm } from "@raycast/utils";
import { fromUnixTime, differenceInDays } from "date-fns";
import { Goal, GoalResponse, DataPointFormValues } from "./types";
import { fetchGoals, sendDatapoint } from "./api";

export default function Command() {
  const { isLoading, data: goals, revalidate: fetchData } = usePromise(fetchGoals);

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
    const goals = Array.isArray(goalsData) ? goalsData : undefined;
    return (
      <List isLoading={isLoading}>
        {goals?.map((goal: Goal) => {
          const [beforeIn, afterIn] = goal.limsum.split("+")?.[1].split(" (")?.[0].split(" in ");
          let goalIcon;

          if (differenceInDays(fromUnixTime(goal.losedate), new Date()) < 1) {
            goalIcon = "🔴";
          } else if (differenceInDays(fromUnixTime(goal.losedate), new Date()) < 2) {
            goalIcon = "🟠";
          } else if (differenceInDays(fromUnixTime(goal.losedate), new Date()) < 3) {
            goalIcon = "🔵";
          } else {
            goalIcon = "🟢";
          }

          return (
            <List.Item
              key={goal.slug}
              title={goal.slug}
              subtitle={`Pledged $${goal.pledge}`}
              accessories={[
                { text: `Due ${beforeIn} ${goal.gunits} in ${afterIn}`, icon: goalIcon },
              ]}
              keywords={[goal.slug, goal.title]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Enter datapoint"
                    target={<DataPointForm goalSlug={goal.slug} />}
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
