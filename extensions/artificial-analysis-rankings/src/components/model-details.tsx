import { Color, Detail, Icon, List } from "@raycast/api";
import { Fragment, useMemo } from "react";
import { failureMessage, useRankingsData } from "../hooks/use-rankings";
import { configurationLabel, familyName } from "../lib/families";
import { detailMetrics, formatRetrievedAt, formatStanding, modelUrl, type MetricPreferences } from "../lib/format";
import { providerIcon } from "../lib/images";
import { modelDetailsMarkdown } from "../lib/markdown";
import { METRIC_GROUPS, METRICS, type MetricKey } from "../lib/metrics";
import { findRanked, type RankedModel } from "../lib/models";
import { buildStandings, standingsFor, type StandingsTable } from "../lib/standings";
import { ModelActions } from "./model-actions";
import { Setup } from "./setup";

export function ModelDetails({ modelId, metric }: { modelId: string; metric: MetricKey }) {
  const data = useRankingsData();
  const standings = useMemo(() => buildStandings(data.snapshot?.models ?? []), [data.snapshot]);
  // Falls back to a metric the model has, e.g. when a comparison opens a model without the requested score.
  const model = useMemo(
    () => findRanked(data.snapshot?.models ?? [], modelId, metric),
    [data.snapshot, modelId, metric],
  );
  if (data.needsApiKey) return <Setup />;
  if (!model || !data.snapshot) {
    return (
      <Detail
        isLoading={data.isLoading}
        markdown={
          data.isLoading
            ? "Loading model…"
            : "# Model Unavailable\n\nThis configuration has no measurements in the latest data."
        }
        actions={<ModelActions data={data} />}
      />
    );
  }
  const warning = failureMessage(data);
  const rows = standingsFor(model, standings, detailMetrics(data.preferences, model.metric));
  return (
    <Detail
      navigationTitle={familyName(model.name)}
      isLoading={data.isLoading}
      markdown={modelDetailsMarkdown(
        model,
        rows,
        warning && `Couldn’t refresh: ${warning} Showing the last saved data.`,
      )}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Provider" text={model.creator} icon={providerIcon(model.creator)} />
          {data.favorites.ids.has(model.id) ? (
            <Detail.Metadata.TagList title="Favorite">
              <Detail.Metadata.TagList.Item text="Saved" icon={Icon.Star} color={Color.Yellow} />
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Intelligence Index Version" text={`v${data.snapshot.indexVersion}`} />
          <Detail.Metadata.Label title="Retrieved" text={formatRetrievedAt(data.snapshot.fetchedAt)} />
          <Detail.Metadata.Link title="Source" text="Artificial Analysis" target={modelUrl(model.slug)} />
        </Detail.Metadata>
      }
      actions={<ModelActions data={data} model={model} showDetails={false} />}
    />
  );
}

/** Compact stats for the selected list row: every shown metric with its rank across all configurations. */
export function ModelDetailPanel({
  model,
  standings,
  preferences,
}: {
  model: RankedModel;
  standings: StandingsTable;
  preferences: MetricPreferences;
}) {
  const shown = new Set(detailMetrics(preferences, model.metric));
  const configuration = configurationLabel(model.name);
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Provider" text={model.creator} icon={providerIcon(model.creator)} />
          {configuration ? <List.Item.Detail.Metadata.Label title="Configuration" text={configuration} /> : null}
          {METRIC_GROUPS.map((group) => {
            const metrics = group.metrics.filter((metric) => shown.has(metric));
            return metrics.length ? (
              <Fragment key={group.title}>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title={group.title} />
                {standingsFor(model, standings, metrics).map((standing) => (
                  <List.Item.Detail.Metadata.Label
                    key={standing.metric}
                    title={METRICS[standing.metric].title}
                    text={{
                      value: formatStanding(standing),
                      color: standing.metric === model.metric ? Color.Blue : undefined,
                    }}
                  />
                ))}
              </Fragment>
            ) : null;
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
