import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useMemo } from "react";
import { useCumulativeCost } from "./hooks/useCumulativeCost";
import { useOpenRouterAPI } from "./hooks/useOpenRouterAPI";
import { ResultViewConfig } from "./type";
import { formatCurrency } from "./utils";

// Main component
export default function ResultView(config: ResultViewConfig) {
  const { response, loading, cost, lastRequestMetadata, error, model, runInference } = useOpenRouterAPI(config);

  const cumulativeCost = useCumulativeCost(cost);

  // Initial load
  useEffect(() => {
    runInference();
  }, []);

  const actions = useMemo(() => {
    if (loading) return null;

    return (
      <ActionPanel title="Actions">
        <Action.CopyToClipboard title="Copy Results" content={response} />
        <Action.Paste title="Paste Results" content={response} />
        <Action title="Retry" onAction={runInference} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
      </ActionPanel>
    );
  }, [loading, response, runInference]);

  // Memoized metadata
  const metadata = useMemo(
    () => (
      <Detail.Metadata>
        {error && (
          <>
            <Detail.Metadata.Label title="Last Error" text={error} />
          </>
        )}

        <Detail.Metadata.Label title="Current Model" text={model} />

        {cumulativeCost > 0 && <Detail.Metadata.Label title="Total Cost" text={formatCurrency(cumulativeCost)} />}

        {lastRequestMetadata && (
          <>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Request cost" text={formatCurrency(lastRequestMetadata.total_cost)} />
            <Detail.Metadata.TagList title="Provider">
              <Detail.Metadata.TagList.Item text={lastRequestMetadata.provider} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Latency" text={lastRequestMetadata.latencyMs.toString() + " ms"} />
            <Detail.Metadata.Label title="Duration" text={lastRequestMetadata.durationS + " s"} />
          </>
        )}
      </Detail.Metadata>
    ),
    [model, cumulativeCost, lastRequestMetadata, error],
  );

  return <Detail markdown={response} isLoading={loading} actions={actions} metadata={metadata} />;
}
