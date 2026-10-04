import {
  AI,
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import {
  consoleURL,
  getModels,
  getPreferences,
  parseExtraModels,
  platformTitle,
  probeModelsEndpoint,
  type ModelsProbe,
} from "./lib/catalog";
import { formatContextWindow, redactEndpoint } from "./lib/format";
import { refreshModelsWithToast } from "./lib/refresh";

type DiscoveryResult = {
  models: AI.RegisteredModel[];
  probe: ModelsProbe | undefined;
  platform: string;
  baseURL: string;
  extraIds: Set<string>;
};

function describeSource(
  probe: ModelsProbe | undefined,
  baseURL: string,
): string {
  if (!probe) return "";
  if (probe.ok) return `Live — GET ${redactEndpoint(baseURL)}/models`;
  return `Fallback list — ${probe.message}`;
}

export default function ShowModels() {
  const [result, setResult] = useState<DiscoveryResult | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  // Render-time snapshot for the unconfigured empty state; load() and the
  // refresh action re-read preferences so settings changes are picked up.
  const savedPrefs = getPreferences();
  const configured = Boolean(savedPrefs.baseURL && savedPrefs.apiKey);

  const apply = useCallback(
    (
      models: AI.RegisteredModel[],
      probe: ModelsProbe | undefined,
      prefs: ReturnType<typeof getPreferences>,
    ) => {
      setResult({
        models,
        probe,
        platform: prefs.platform,
        baseURL: prefs.baseURL,
        extraIds: new Set(parseExtraModels(prefs.extraModels)),
      });
    },
    [],
  );

  const load = useCallback(async () => {
    const prefs = getPreferences();
    if (!prefs.baseURL || !prefs.apiKey) {
      setResult(undefined);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Both calls share the probe's in-flight dedupe / 60s cache, so this is
      // at most one network request — the same one getModels() always makes.
      const [models, probe] = await Promise.all([
        getModels(),
        probeModelsEndpoint(prefs.baseURL, prefs.apiKey),
      ]);
      apply(models, probe, prefs);
    } catch (error) {
      // Keep the last good list on a transient failure — blanking it would
      // contradict the failure toast with a "no models" empty state.
      await showFailureToast(error, { title: "Could not load the model list" });
    } finally {
      setIsLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh re-runs discovery bypassing both the probe and the models.dev
  // metadata caches, then swaps the displayed list for the fresh result. The
  // loading bar runs over the stale list — result is never cleared here, so
  // the early-return guard above cannot trigger mid-refresh.
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const outcome = await refreshModelsWithToast();
      if (!outcome) return;
      apply(outcome.models, outcome.probe, getPreferences());
    } finally {
      setIsLoading(false);
    }
  }, [apply]);

  // The first load hasn't resolved yet — show only the loading bar, not an
  // empty state that suggests discovery returned nothing.
  if (isLoading && !result) {
    return <List isLoading />;
  }

  const hasModels = Boolean(result && result.models.length > 0);

  return (
    <List isLoading={isLoading} isShowingDetail={hasModels}>
      {result && hasModels ? (
        <List.Section
          title={`${result.models.length} models — ${platformTitle(result.platform)}`}
        >
          {result.models.map((model) => (
            <ModelListItem
              key={model.id}
              model={model}
              result={result}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      ) : configured ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="No models to show"
          description={
            result?.probe && !result.probe.ok
              ? result.probe.message
              : result
                ? "Discovery returned no usable models. For a Custom endpoint, add model IDs via the Extra Models preference, then refresh."
                : "Could not load the model list. Check your connection, then run Refresh Models."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Models"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <Action
                title="Open Platform Console"
                icon={Icon.Globe}
                onAction={() => void open(consoleURL(savedPrefs.platform))}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => void openExtensionPreferences()}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Plug}
          title="GLM Models is not configured"
          description="Set your API key (and, for the Custom platform, a base URL) in the extension preferences, then run Refresh Models."
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => void openExtensionPreferences()}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function ModelListItem({
  model,
  result,
  onRefresh,
}: {
  model: AI.RegisteredModel;
  result: DiscoveryResult;
  onRefresh: () => Promise<void>;
}) {
  // getModels() only appends Extra Models ids that live discovery didn't
  // already return, so an id the endpoint itself serves must not be tagged.
  const isExtra =
    result.extraIds.has(model.id) &&
    !(result.probe?.ok && result.probe.ids.includes(model.id));
  const source = describeSource(result.probe, result.baseURL);
  const capabilities = model.capabilities;
  const vision = capabilities?.vision;
  const effort = capabilities?.reasoningEffort;
  const tools = capabilities?.tools;
  return (
    <List.Item
      title={model.title}
      // When models.dev knows the id, title is the display name and the id
      // goes in the subtitle; an unknown id would render the same string
      // twice, so it gets no subtitle.
      subtitle={model.title === model.id ? undefined : model.id}
      keywords={[model.id]}
      detail={
        // Metadata-only detail on purpose: Raycast pins the markdown area
        // above the metadata grid with a fixed split and no way to resize it,
        // which left a large dead zone between a one-line description and a
        // metadata grid you had to scroll. One grid shows everything at once.
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Description"
                text={model.description || "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Model ID"
                text={model.id}
              />
              <List.Item.Detail.Metadata.Label
                title="Context Window"
                text={formatContextWindow(model.contextWindow)}
              />
              <List.Item.Detail.Metadata.Label
                title="Vision"
                text={
                  vision
                    ? `yes — ${vision.mediaTypes
                        .map((type) =>
                          type.replace(/^image\//, "").toUpperCase(),
                        )
                        .join(", ")}`
                    : "no"
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Reasoning"
                text={
                  effort
                    ? `yes — effort adjustable (default ${effort.default})`
                    : "no"
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Tools"
                text={tools && !tools.supported ? "no" : "yes"}
              />
              {isExtra && (
                <List.Item.Detail.Metadata.Label
                  title="Origin"
                  text="Extra Models preference"
                />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Platform"
                text={platformTitle(result.platform)}
              />
              <List.Item.Detail.Metadata.Label
                title="Endpoint"
                text={redactEndpoint(result.baseURL)}
              />
              {source && (
                <List.Item.Detail.Metadata.Label title="Source" text={source} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Model ID" content={model.id} />
          <Action
            title="Refresh Models"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
          />
          <Action
            title="Open Platform Console"
            icon={Icon.Globe}
            onAction={() => void open(consoleURL(result.platform))}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}
