import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { calliday, callidayJSON, clock, fmt, Tomatoes } from "./lib/cli";
import { CallidayErrorView } from "./lib/error-view";

function grade(count: number): string {
  if (count === 0) return "The vine rests.";
  if (count <= 2) return "A modest picking.";
  if (count <= 5) return "A good basketful.";
  if (count <= 9) return "Bumper crop!";
  if (count <= 19) return "The greenhouse is thriving.";
  return "Legendary harvest — leave some for the shops.";
}

export default function TomatoesView() {
  const { data, error, isLoading, revalidate } = usePromise(() => callidayJSON<Tomatoes>(["tomatoes"]), [], {
    failureToastOptions: { title: "Couldn't reach Calliday" },
  });

  const startAction = (
    <Action
      title="Start Tomato"
      icon={Icon.Play}
      onAction={async () => {
        try {
          await calliday(["tomatoes", "--start"]);
          await showToast({
            style: Toast.Style.Success,
            title: "🍅 Tomato planted",
          });
          revalidate();
        } catch (err) {
          await showFailureToast(err, { title: "Couldn't start a tomato" });
        }
      }}
    />
  );

  return (
    <List isLoading={isLoading}>
      {error ? (
        <CallidayErrorView error={error} />
      ) : (
        data && (
          <>
            <List.Section title="On the vine">
              {data.active_remaining_minutes != null ? (
                <List.Item
                  icon={{ source: Icon.CircleProgress75, tintColor: Color.Red }}
                  title={`Ripens in ${data.active_remaining_minutes} min`}
                  subtitle="stay focused"
                  actions={
                    <ActionPanel>
                      <Action
                        title="Give up This Tomato"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const confirmed = await confirmAlert({
                            title: "Give up This Tomato?",
                            message: "The tomato on the vine will be released.",
                            primaryAction: {
                              title: "Give up",
                              style: Alert.ActionStyle.Destructive,
                            },
                          });
                          if (!confirmed) return;
                          try {
                            await calliday(["tomatoes", "--giveup"]);
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Tomato released",
                            });
                            revalidate();
                          } catch (err) {
                            await showFailureToast(err, { title: "Couldn't give up the tomato" });
                          }
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ) : (
                <List.Item
                  icon={Icon.Circle}
                  title="No tomato growing"
                  subtitle={`one tomato = ${data.interval_minutes} min of focus`}
                  actions={<ActionPanel>{startAction}</ActionPanel>}
                />
              )}
            </List.Section>
            <List.Section title={`Today's harvest — ${grade(data.tomatoes)}`}>
              <List.Item
                icon={Icon.Leaf}
                title={data.tomatoes > 0 ? "🍅".repeat(Math.min(data.tomatoes, 20)) : "🌱"}
                accessories={[{ text: `${data.tomatoes} total` }]}
                actions={<ActionPanel>{startAction}</ActionPanel>}
              />
              {data.runs
                .filter((run) => run.ripenings.length > 0)
                .map((run) => (
                  <List.Item
                    key={run.start}
                    icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
                    title={`${clock(run.start)} – ${clock(run.end)}`}
                    subtitle={`${fmt(run.focus_seconds)} of focus`}
                    accessories={[{ text: "🍅".repeat(Math.min(run.ripenings.length, 8)) }]}
                    actions={<ActionPanel>{startAction}</ActionPanel>}
                  />
                ))}
            </List.Section>
          </>
        )
      )}
    </List>
  );
}
