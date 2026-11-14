import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Heatmap, HeatmapCell, HeatmapView } from "./heatmap-data";
import { HeatmapWeek, buildWeeklyHeatmap } from "./heatmap-weekly";
import { agentLabels, count, metrics, costLabel } from "./report-data";

export function HeatmapDetails({
  map,
  view,
  formatValue,
}: {
  map: Heatmap;
  view: HeatmapView;
  formatValue: (value: number) => string;
}) {
  const label = view === "daily" ? "Daily" : "Weekly";
  const dateLabel = (day: HeatmapCell | HeatmapWeek) => ("endDate" in day ? `${day.date} — ${day.endDate}` : day.date);
  const dayValue = (day: HeatmapCell | HeatmapWeek) =>
    map.metric === "costs" ? costLabel(day.cost) : formatValue(day.value);
  const days = (view === "weekly" ? buildWeeklyHeatmap(map).weeks : map.cells.filter((cell) => cell.inRange)).reverse();
  return (
    <List navigationTitle={`${label} Activity`} searchBarPlaceholder="Find a date…" isShowingDetail>
      {days.map((day) => (
        <List.Item
          key={day.date}
          title={dateLabel(day)}
          icon={Icon.Calendar}
          accessories={[{ text: dayValue(day) }]}
          detail={
            <List.Item.Detail
              markdown={`## ${dateLabel(day)}

${agentLabels[map.agent]} · ${metrics[map.metric]}: ${dayValue(day)}`}
              metadata={
                <List.Item.Detail.Metadata>
                  {day.contributions.map((entry) => (
                    <List.Item.Detail.Metadata.Label
                      key={entry.agent}
                      title={agentLabels[entry.agent]}
                      text={`${count(entry.tokens)} tokens · ${count(entry.messages)} messages · ${costLabel(entry.cost)}`}
                    />
                  ))}
                  {!day.contributions.length && (
                    <List.Item.Detail.Metadata.Label title="Activity" text="No recorded activity" />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title={`Copy ${label} Summary`}
                content={`${dateLabel(day)} · ${agentLabels[map.agent]}: ${dayValue(day)} ${metrics[map.metric].toLowerCase()}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
