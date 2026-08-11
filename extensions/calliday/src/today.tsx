import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { callidayJSON, fmt, Report } from "./lib/cli";

function productivityTint(score?: number | null): Color {
  if (score == null) return Color.SecondaryText;
  if (score > 0.15) return Color.Green;
  if (score < -0.15) return Color.Red;
  return Color.SecondaryText;
}

export default function Today() {
  const { data, isLoading } = usePromise(() =>
    callidayJSON<Report>(["report", "day"]),
  );

  const actions = (
    <ActionPanel>
      <Action
        title="Open Calliday"
        icon={Icon.AppWindow}
        onAction={() => open("calliday://")}
      />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading}>
      {data && (
        <>
          <List.Section title={data.rangeLabel}>
            <List.Item
              icon={{ source: Icon.Clock, tintColor: Color.Orange }}
              title={`${fmt(data.totalSeconds)} tracked`}
              accessories={
                data.productivity != null
                  ? [
                      {
                        tag: {
                          value: `${Math.round(data.productivity * 100)}% productive`,
                          color: productivityTint(data.productivity),
                        },
                      },
                    ]
                  : []
              }
              actions={actions}
            />
          </List.Section>
          <List.Section title="Projects">
            {data.byProject.slice(0, 8).map((row) => (
              <List.Item
                key={row.name}
                icon={{
                  source: Icon.CircleFilled,
                  tintColor: productivityTint(row.productivity),
                }}
                title={row.name}
                accessories={[{ text: fmt(row.seconds) }]}
                actions={actions}
              />
            ))}
          </List.Section>
          <List.Section title="Apps">
            {data.byApp.slice(0, 8).map((row) => (
              <List.Item
                key={row.name}
                icon={Icon.AppWindowList}
                title={row.name}
                accessories={[{ text: fmt(row.seconds) }]}
                actions={actions}
              />
            ))}
          </List.Section>
          {data.byDomain.length > 0 && (
            <List.Section title="Sites">
              {data.byDomain.slice(0, 6).map((row) => (
                <List.Item
                  key={row.name}
                  icon={Icon.Globe}
                  title={row.name}
                  accessories={[{ text: fmt(row.seconds) }]}
                  actions={actions}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
