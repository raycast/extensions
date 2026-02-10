import { ActionPanel, Action, List, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRunAssets, dagsterRunUrl } from "../api";
import { formatTimestamp } from "../helpers";
import AssetMaterializations from "./AssetMaterializations";
import AssetMetrics from "./AssetMetrics";

interface Props {
  runId: string;
  jobName: string;
}

export default function RunAssets({ runId, jobName }: Props) {
  const { data: assets, isLoading } = useCachedPromise(fetchRunAssets, [runId]);
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = prefs.dagsterUrl.replace(/\/+$/, "");

  return (
    <List isLoading={isLoading} navigationTitle={`${jobName} — Assets`} searchBarPlaceholder="Filter assets...">
      <List.EmptyView title="No Assets" description="No assets found for this run." />
      {assets?.map((asset, idx) => {
        const assetPath = asset.assetKey;
        const assetKey = assetPath.join(".");
        const assetUrl = `${baseUrl}/assets/${assetPath.map(encodeURIComponent).join("/")}`;

        return (
          <List.Item
            key={`${assetKey}-${idx}`}
            icon={Icon.Layers}
            title={assetKey}
            subtitle={asset.stepKey}
            accessories={[{ text: formatTimestamp(asset.timestamp, true) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Materializations"
                  icon={Icon.List}
                  target={<AssetMaterializations assetPath={assetPath} assetKey={assetKey} />}
                />
                <Action.Push
                  title="View Metrics"
                  icon={Icon.LineChart}
                  target={<AssetMetrics assetPath={assetPath} assetKey={assetKey} />}
                />
                <Action.OpenInBrowser
                  title="Open Asset in Dagster"
                  url={assetUrl}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action.OpenInBrowser title="Open Run in Dagster" url={dagsterRunUrl(runId)} />
                <Action.CopyToClipboard
                  title="Copy Asset Key"
                  content={assetKey}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
