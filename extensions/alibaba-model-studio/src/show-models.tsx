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
import { useCallback, useEffect, useRef, useState } from "react";
import {
  consoleURL,
  getModels,
  getPreferences,
  parseExtraModels,
  platformTitle,
  probeModelsEndpoint,
  probeWorkspace,
  type ModelsProbe,
} from "./lib/catalog";
import { formatContextWindow, redactEndpoint } from "./lib/format";
import { refreshModelsWithToast, type RefreshedPrefs } from "./lib/refresh";

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

function emptyViewDescription(
  refreshError: string | undefined,
  result: DiscoveryResult | undefined,
): string {
  if (refreshError) return `Refresh failed — ${refreshError}`;
  if (result?.probe && !result.probe.ok) return result.probe.message;
  if (result) {
    return "Discovery returned no usable models. For a Custom endpoint, add model IDs via the Extra Models preference, then refresh.";
  }
  return "Could not load the model list. Check your connection, then run Refresh Models.";
}

export default function ShowModels() {
  const [result, setResult] = useState<DiscoveryResult | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  // Set when an explicit refresh's probe failed: the list deliberately keeps
  // showing what the picker serves, and this surfaces the failure in the view.
  const [refreshError, setRefreshError] = useState<string | undefined>();
  // Render-time snapshot for the unconfigured empty state; load() and the
  // refresh action re-read preferences so settings changes are picked up.
  const savedPrefs = getPreferences();
  const configured = Boolean(savedPrefs.baseURL && savedPrefs.apiKey);

  const apply = useCallback(
    (
      models: AI.RegisteredModel[],
      probe: ModelsProbe | undefined,
      prefs: RefreshedPrefs,
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
        probeModelsEndpoint(
          prefs.baseURL,
          prefs.apiKey,
          probeWorkspace(prefs.platform, prefs.workspaceId),
        ),
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
  // the early-return guard above cannot trigger mid-refresh. The ref guard
  // mirrors Check Setup's: state alone can't stop a double invocation, and an
  // out-of-order apply must never leave an older discovery on screen.
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setIsLoading(true);
    try {
      const outcome = await refreshModelsWithToast();
      if (!outcome) return;
      if (outcome.status === "ok") {
        setRefreshError(undefined);
        // Label with the snapshot the refresh ran against, never a fresh
        // read: settings saved while the refresh was in flight would label
        // the old endpoint's models with the new platform and base URL.
        apply(outcome.models, outcome.probe, outcome.prefs);
      } else {
        // Keep the list the picker is still serving; surface the failure in
        // the view so an explicit refresh never looks like a silent no-op.
        setRefreshError(outcome.probe.message);
      }
    } finally {
      refreshing.current = false;
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
      {refreshError && hasModels && (
        <List.Section title="Last refresh failed">
          <List.Item
            title="Showing the last good model list"
            subtitle={refreshError}
            // The list is in split view and this row is selected first — give
            // the detail pane the full message, which the subtitle truncates.
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Refresh Error"
                      text={refreshError}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Models"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
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
          description={emptyViewDescription(refreshError, result)}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Models"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <Action
                title="Open Model Studio Console"
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
          title="Alibaba Model Studio is not configured"
          description="Set your API key (and, for the Custom platform, a base URL) in the extension preferences, then run Refresh Models."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Models"
                icon={Icon.ArrowClockwise}
                // Re-reads preferences and runs discovery, so the view picks
                // up a configuration saved while this empty state was open.
                onAction={() => void load()}
              />
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
  // already return — and only a live probe makes provenance provable. When
  // the list came from the models.dev / curated fallback, an id that happens
  // to match an Extra Models entry must not be tagged as user-added.
  const isExtra =
    result.probe?.ok === true &&
    result.extraIds.has(model.id) &&
    !result.probe.ids.includes(model.id);
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
                    ? `yes — thinking on/off (default ${effort.default})`
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
            title="Open Model Studio Console"
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
