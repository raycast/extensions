import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { DASHBOARD_URL, fetchFunnelAnalytics } from "../../api";
import type { Funnel } from "../../types";
import { fmt } from "../../lib/utils";

function conversionColor(rate: number): Color {
  if (rate > 50) return Color.Green;
  if (rate > 25) return Color.Yellow;
  return Color.Red;
}

export function FunnelAnalyticsView({ funnel }: { funnel: Funnel }) {
  const { data, isLoading } = useCachedPromise(fetchFunnelAnalytics, [funnel.id, funnel.websiteId], {
    keepPreviousData: true,
  });

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser title="Open in Databuddy" url={DASHBOARD_URL} />
    </ActionPanel>
  );

  const empty = !isLoading && !data;

  return (
    <List isLoading={isLoading} navigationTitle={`${funnel.name} — Analytics`}>
      {empty && (
        <List.EmptyView
          icon={Icon.BarChart}
          title="No Analytics Data"
          description="No funnel analytics data available yet."
          actions={actions}
        />
      )}

      {data && (
        <List.Section title="Overview">
          <List.Item
            icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
            title="Overall Conversion Rate"
            accessories={[
              {
                tag: {
                  value: `${Math.round(data.overall_conversion_rate)}%`,
                  color: conversionColor(data.overall_conversion_rate),
                },
              },
            ]}
            actions={actions}
          />
          <List.Item
            icon={{ source: Icon.Person, tintColor: Color.Purple }}
            title="Users Entered"
            accessories={[{ text: { value: fmt(data.total_users_entered), color: Color.Purple } }]}
            actions={actions}
          />
          <List.Item
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            title="Users Completed"
            accessories={[{ text: { value: fmt(data.total_users_completed), color: Color.Green } }]}
            actions={actions}
          />
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
            title="Avg Completion Time"
            accessories={[{ text: data.avg_completion_time_formatted }]}
            actions={actions}
          />
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title={`Biggest Drop-off: Step ${data.biggest_dropoff_step}`}
            accessories={[{ tag: { value: `${Math.round(data.biggest_dropoff_rate)}%`, color: Color.Red } }]}
            actions={actions}
          />
        </List.Section>
      )}

      {data && data.steps_analytics.length > 0 && (
        <List.Section title="Steps" subtitle={`${data.steps_analytics.length} steps`}>
          {data.steps_analytics.map((step) => (
            <List.Item
              key={step.step_number}
              icon={{ source: Icon.ChevronRight, tintColor: Color.Blue }}
              title={`${step.step_number}. ${step.step_name}`}
              subtitle={`${fmt(step.users)} entered · ${fmt(step.total_users)} total`}
              accessories={[
                {
                  tag: { value: `${Math.round(step.conversion_rate)}%`, color: conversionColor(step.conversion_rate) },
                },
                {
                  tag: {
                    value: `↓ ${Math.round(step.dropoff_rate)}%`,
                    color: step.dropoff_rate > 50 ? Color.Red : Color.SecondaryText,
                  },
                },
              ]}
              actions={actions}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
