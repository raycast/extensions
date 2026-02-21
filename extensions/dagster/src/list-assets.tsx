import {
  ActionPanel,
  Action,
  List,
  Icon,
  Keyboard,
  getPreferenceValues,
  showToast,
  Toast,
  confirmAlert,
  open,
  Alert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { fetchAssetGraph, materializeAssets, dagsterRunUrl } from "./api";
import { formatTimestamp, buildGraphIndex, resolveAssetSelection, groupByJob, type MaterializeScope } from "./helpers";
import AssetMaterializations from "./components/AssetMaterializations";
import AssetMetrics from "./components/AssetMetrics";

const SCOPE_LABELS: Record<MaterializeScope, string> = {
  this: "Materialize",
  downstream: "Materialize + Downstream",
  upstream: "Materialize + Upstream",
  "upstream+downstream": "Materialize + Upstream + Downstream",
};

export default function ListAssets() {
  const { data: assets, isLoading } = useCachedPromise(fetchAssetGraph);
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = prefs.dagsterUrl.replace(/\/+$/, "");
  const graphIndex = useMemo(() => buildGraphIndex(assets ?? []), [assets]);
  const [groupFilter, setGroupFilter] = useState("All");

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets ?? []) {
      if (a.groupName) set.add(a.groupName);
    }
    return Array.from(set).sort();
  }, [assets]);

  const filtered = groupFilter === "All" ? assets : assets?.filter((a) => a.groupName === groupFilter);

  async function handleMaterialize(assetPath: string[], scope: MaterializeScope) {
    const selected = resolveAssetSelection(assetPath, scope, graphIndex);
    if (selected.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No materializable assets found" });
      return;
    }

    const names = selected.map((n) => n.assetKey.path.join("."));
    const summary =
      names.length <= 5 ? names.join(", ") : `${names.slice(0, 5).join(", ")} and ${names.length - 5} more`;

    if (
      !(await confirmAlert({
        title: `${SCOPE_LABELS[scope]}?`,
        message: `This will materialize ${selected.length} asset${selected.length > 1 ? "s" : ""}: ${summary}`,
        primaryAction: { title: "Materialize" },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      }))
    ) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Materializing..." });
    try {
      const groups = groupByJob(selected);
      const runIds: string[] = [];
      for (const group of groups) {
        const runId = await materializeAssets(group.assetKeys, group.jobName, group.repositoryName, group.locationName);
        runIds.push(runId);
      }
      toast.style = Toast.Style.Success;
      toast.title = runIds.length === 1 ? "Run launched" : `${runIds.length} runs launched`;
      toast.primaryAction = {
        title: "Open in Dagster",
        onAction: () => open(dagsterRunUrl(runIds[0])),
      };
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = String(e);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter assets..."
      searchBarAccessory={
        groups.length > 1 ? (
          <List.Dropdown tooltip="Asset Group" value={groupFilter} onChange={setGroupFilter}>
            <List.Dropdown.Item title="All Groups" value="All" />
            <List.Dropdown.Section>
              {groups.map((g) => (
                <List.Dropdown.Item key={g} title={g} value={g} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView title="No Assets" description="No assets match the selected filter." />
      {filtered?.map((asset) => {
        const assetPath = asset.assetKey.path;
        const assetKey = assetPath.join(".");
        const lastMat = asset.assetMaterializations[0];
        const assetUrl = `${baseUrl}/assets/${assetPath.map(encodeURIComponent).join("/")}`;
        const canMaterialize = asset.isMaterializable && !asset.isPartitioned;

        return (
          <List.Item
            key={assetKey}
            icon={Icon.Layers}
            title={assetKey}
            subtitle={lastMat ? formatTimestamp(lastMat.timestamp, true) : ""}
            accessories={asset.groupName ? [{ tag: asset.groupName }] : []}
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
                {canMaterialize && (
                  <ActionPanel.Section title="Materialize">
                    <Action
                      title="Materialize"
                      icon={Icon.Play}
                      onAction={() => handleMaterialize(assetPath, "this")}
                    />
                    <Action
                      title="Materialize + Downstream"
                      icon={Icon.ArrowRight}
                      onAction={() => handleMaterialize(assetPath, "downstream")}
                    />
                    <Action
                      title="Materialize + Upstream"
                      icon={Icon.ArrowLeft}
                      onAction={() => handleMaterialize(assetPath, "upstream")}
                    />
                    <Action
                      title="Materialize + Upstream + Downstream"
                      icon={Icon.Switch}
                      onAction={() => handleMaterialize(assetPath, "upstream+downstream")}
                    />
                  </ActionPanel.Section>
                )}
                <Action.OpenInBrowser title="Open in Dagster" url={assetUrl} shortcut={Keyboard.Shortcut.Common.Open} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
