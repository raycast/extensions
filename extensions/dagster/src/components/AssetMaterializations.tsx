import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchAssetMaterializations, dagsterRunUrl } from "../api";
import { formatTimestamp, materializationDuration, formatDuration, statusIcon, statusColor } from "../helpers";
import MaterializationDetail from "./MaterializationDetail";

interface Props {
  assetPath: string[];
  assetKey: string;
}

export default function AssetMaterializations({ assetPath, assetKey }: Props) {
  const { data: materializations, isLoading, revalidate } = useCachedPromise(fetchAssetMaterializations, [assetPath]);

  return (
    <List isLoading={isLoading} navigationTitle={assetKey} searchBarPlaceholder="Filter materializations...">
      <List.EmptyView title="No Materializations" description="No materializations found for this asset." />
      {materializations?.map((mat, idx) => {
        const duration = materializationDuration(mat);
        const status = mat.stepStats?.status ?? "UNKNOWN";
        const shortRunId = mat.runId.slice(0, 8);

        return (
          <List.Item
            key={`${mat.runId}-${idx}`}
            icon={{ source: statusIcon(status), tintColor: statusColor(status) }}
            title={`${shortRunId} - ${mat.stepKey}`}
            subtitle={formatTimestamp(mat.timestamp, true)}
            accessories={[...(mat.partition ? [{ tag: mat.partition }] : []), { text: formatDuration(duration) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Metadata"
                  icon={Icon.Sidebar}
                  target={<MaterializationDetail materialization={mat} />}
                />
                <Action.OpenInBrowser
                  title="Open Run in Dagster"
                  url={dagsterRunUrl(mat.runId)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action.CopyToClipboard
                  title="Copy Run URL"
                  content={dagsterRunUrl(mat.runId)}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
