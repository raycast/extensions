import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  environment,
  Icon,
  List,
  type LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { RESOURCE_DEFINITIONS, type ResourceKey } from "./api/resources";
import type { JsonObject } from "./api/types";
import { ResourceItem, resourceTitle } from "./components/resource-item";
import { ResourceError } from "./components/states";
import { useAsyncResource } from "./hooks/use-async-resource";
import { useUniFiClient } from "./hooks/use-unifi";
import { cameraPreviewMarkdown } from "./lib/camera-preview";
import { focusResourceItems, type ResourceLaunchContext } from "./lib/resource-navigation";

const PROTECT_RESOURCES = RESOURCE_DEFINITIONS.filter((resource) => resource.service === "protect");

function CameraSnapshot({ camera }: { camera: JsonObject }) {
  const client = useUniFiClient();
  const cameraId = String(camera.id);
  const load = useCallback(
    async () =>
      cameraPreviewMarkdown({
        cameraId,
        directory: environment.supportPath,
        snapshot: await client.getCameraSnapshot(cameraId),
      }),
    [cameraId, client],
  );
  const { data, error, isLoading, revalidate } = useAsyncResource(load);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={resourceTitle(camera, "Camera Snapshot")}
      markdown={error ? `Could not load the snapshot.\n\n${error.message}` : (data ?? "")}
      actions={
        <ActionPanel>
          <Action title="Refresh Snapshot" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}

function ProtectActions({
  item,
  resourceKey,
  onRefresh,
}: {
  item: JsonObject;
  resourceKey: ResourceKey;
  onRefresh: () => void;
}) {
  const client = useUniFiClient();
  const id = String(item.id ?? "");
  const name = resourceTitle(item, "Protect device");

  const runSirenAction = async (action: "play-siren" | "stop-siren" | "test-siren") => {
    const label = action === "play-siren" ? "Play" : action === "stop-siren" ? "Stop" : "Test";
    const confirmed = await confirmAlert({
      title: `${label} ${name}?`,
      message: action === "stop-siren" ? "This stops the active siren." : "This will make the physical siren sound.",
      primaryAction: {
        title: label,
        style: action === "stop-siren" ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `${label} ${name}` });
    try {
      await client.controlProtect({ action, deviceId: id });
      toast.style = Toast.Style.Success;
      toast.title = `${label} requested`;
      onRefresh();
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = `${label} failed`;
      toast.message = caught instanceof Error ? caught.message : "Unknown error";
    }
  };

  const runArmAction = async (action: "arm" | "disarm") => {
    const label = action === "arm" ? "Arm" : "Disarm";
    const confirmed = await confirmAlert({
      title: `${label} Protect?`,
      message: `This will ${action} the physical Protect alarm system using its current profile.`,
      primaryAction: {
        title: label,
        style: action === "arm" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `${label}ing Protect` });
    try {
      await client.controlProtect({ action });
      toast.style = Toast.Style.Success;
      toast.title = `${label} requested`;
      onRefresh();
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = `${label} failed`;
      toast.message = caught instanceof Error ? caught.message : "Unknown error";
    }
  };

  return (
    <ActionPanel>
      {resourceKey === "protect-cameras" && item.state === "CONNECTED" ? (
        <Action.Push title="View Current Snapshot" icon={Icon.Camera} target={<CameraSnapshot camera={item} />} />
      ) : null}
      {resourceKey === "protect-sirens" ? (
        <ActionPanel.Section title="Siren">
          <Action
            title="Play Siren for 5 Seconds"
            icon={Icon.SpeakerHigh}
            style={Action.Style.Destructive}
            onAction={() => runSirenAction("play-siren")}
          />
          <Action title="Stop Siren" icon={Icon.Stop} onAction={() => runSirenAction("stop-siren")} />
          <Action
            title="Test Siren"
            icon={Icon.SpeakerOn}
            style={Action.Style.Destructive}
            onAction={() => runSirenAction("test-siren")}
          />
        </ActionPanel.Section>
      ) : null}
      {resourceKey === "protect-nvr" ? (
        <ActionPanel.Section title="Alarm">
          <Action
            title="Arm Protect"
            icon={Icon.Lock}
            style={Action.Style.Destructive}
            onAction={() => runArmAction("arm")}
          />
          <Action title="Disarm Protect" icon={Icon.LockUnlocked} onAction={() => runArmAction("disarm")} />
        </ActionPanel.Section>
      ) : null}
      <Action.CopyToClipboard title="Copy JSON" content={JSON.stringify(item, null, 2)} />
      {id ? <Action.CopyToClipboard title="Copy ID" content={id} /> : null}
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
    </ActionPanel>
  );
}

type BrowseProtectProps = LaunchProps<{ launchContext?: ResourceLaunchContext }>;

export default function BrowseProtect(props: BrowseProtectProps) {
  const client = useUniFiClient();
  const [resourceKey, setResourceKey] = useState<ResourceKey>(props.launchContext?.resourceKey ?? "protect-cameras");
  const [targetEntityId, setTargetEntityId] = useState(props.launchContext?.entityId);
  const load = useCallback(
    (signal: AbortSignal) => client.listResource(resourceKey, {}, signal),
    [client, resourceKey],
  );
  const { data: items = [], error, isLoading, revalidate } = useAsyncResource(load);
  const definition = PROTECT_RESOURCES.find((candidate) => candidate.key === resourceKey);
  const sortedItems = useMemo(
    () =>
      resourceKey === "protect-cameras"
        ? [...items].sort(
            (left, right) =>
              Number(right.state === "CONNECTED") - Number(left.state === "CONNECTED") ||
              String(left.name ?? "").localeCompare(String(right.name ?? "")),
          )
        : items,
    [items, resourceKey],
  );
  const visibleItems = useMemo(() => focusResourceItems(sortedItems, targetEntityId), [sortedItems, targetEntityId]);

  if (error) return <ResourceError error={error} onRetry={revalidate} />;

  return (
    <List
      filtering
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={`Search ${definition?.label ?? "Protect"}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Protect Resource"
          value={resourceKey}
          onChange={(value) => {
            setResourceKey(value as ResourceKey);
            setTargetEntityId(undefined);
          }}
        >
          {PROTECT_RESOURCES.map((resource) => (
            <List.Dropdown.Item
              key={resource.key}
              title={resource.label.replace("Protect ", "")}
              value={resource.key}
            />
          ))}
        </List.Dropdown>
      }
    >
      {visibleItems.map((item, index) => (
        <ResourceItem
          key={String(item.id ?? `${resourceKey}-${index}`)}
          item={item}
          fallbackTitle={`${definition?.label ?? "Protect resource"} ${index + 1}`}
          actions={<ProtectActions item={item} resourceKey={resourceKey} onRefresh={revalidate} />}
        />
      ))}
      {!isLoading && visibleItems.length === 0 ? (
        <List.EmptyView
          title={targetEntityId ? "Protect resource not found" : `No ${definition?.label ?? "Protect resources"} found`}
          actions={
            targetEntityId ? (
              <ActionPanel>
                <Action title="Show All Resources" icon={Icon.List} onAction={() => setTargetEntityId(undefined)} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : null}
    </List>
  );
}
