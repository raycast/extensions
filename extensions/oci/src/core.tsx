import { Action, ActionPanel, Alert, Color, confirmAlert, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import * as core from "oci-core";
import { Instance } from "oci-core/lib/model";
import { mapObjectToMarkdownTable, onError } from "./utils";
import { InstanceActionRequest } from "oci-core/lib/request";
import OpenInOCI from "./open-in-oci";
import { common, OCIProvider, useProvider } from "./oci";

export default function Command() {
  return (
    <OCIProvider>
      <Core />
    </OCIProvider>
  );
}

function Core() {
  const { provider } = useProvider();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-instance-details", false);

  const {
    isLoading,
    data: instances,
    mutate,
  } = useCachedPromise(
    async () => {
      const computeClient = new core.ComputeClient({ authenticationDetailsProvider: provider });
      const instances = await computeClient.listInstances({ compartmentId: provider.getTenantId() });
      return instances.items;
    },
    [],
    { initialData: [], onError },
  );

  function getInstanceColor(state: Instance.LifecycleState) {
    switch (state) {
      case core.models.Instance.LifecycleState.Running:
        return Color.Green;
      case core.models.Instance.LifecycleState.Stopped:
        return Color.Yellow;
      case core.models.Instance.LifecycleState.Provisioning:
        return Color.Blue;
      case core.models.Instance.LifecycleState.Starting:
      case core.models.Instance.LifecycleState.Stopping:
      case core.models.Instance.LifecycleState.Terminating:
        return Color.Orange;
      case core.models.Instance.LifecycleState.Terminated:
        return Color.Red;
      default:
        return undefined;
    }
  }

  async function confirmAndTerminate(instance: Instance) {
    const options: Alert.Options = {
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: "Terminate instance",
      message: `Do you want to permanently delete instance "${instance.displayName || instance.id}"?`,
      primaryAction: {
        title: "Terminate",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) doInstanceAction(instance, "TERMINATE");
  }

  async function doInstanceAction(instance: Instance, action: InstanceActionRequest["action"]) {
    const toast = await showToast(Toast.Style.Animated, action, instance.displayName ?? "");
    try {
      const computeClient = new core.ComputeClient({ authenticationDetailsProvider: provider });
      await mutate(
        action !== "TERMINATE"
          ? computeClient.instanceAction({
              instanceId: instance.id,
              action,
            })
          : computeClient.terminateInstance({ instanceId: instance.id }),
      );
      toast.style = Toast.Style.Success;
      toast.title = `${action} ✅`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `${action} ❌`;
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search instances">
      {instances.map((instance) => {
        const accessories: List.Item.Accessory[] = [
          { date: new Date(instance.timeCreated), tooltip: `Created ${new Date(instance.timeCreated).toString()}` },
        ];
        if (instance.systemTags && instance.systemTags["orcl-cloud"]?.["free-tier-retained"] === "true")
          accessories.push({ tag: "Always Free" });

        const markdown = mapObjectToMarkdownTable("## Shape Config", instance.shapeConfig);

        return (
          <List.Item
            key={instance.id}
            icon={{
              value: { source: Icon.CircleFilled, tintColor: getInstanceColor(instance.lifecycleState) },
              tooltip: instance.lifecycleState,
            }}
            title={instance.displayName ?? ""}
            subtitle={isShowingDetail ? undefined : instance.shape}
            accessories={isShowingDetail ? undefined : accessories}
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Availability Domain" text={instance.availabilityDomain} />
                    <List.Item.Detail.Metadata.Label title="Compartment ID" text={instance.compartmentId} />
                    <List.Item.Detail.Metadata.Label title="ID" text={instance.id} />
                    <List.Item.Detail.Metadata.TagList title="Lifecycle State">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={instance.lifecycleState}
                        color={getInstanceColor(instance.lifecycleState)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Region" text={instance.region} />
                    <List.Item.Detail.Metadata.Label title="Shape" text={instance.shape} />
                    <List.Item.Detail.Metadata.Label title="Time Created" text={instance.timeCreated.toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action.Push
                  icon={Icon.List}
                  title="View VNIC Attachments"
                  target={<ListInstanceVnicAttachments instanceId={instance.id} provider={provider} />}
                />
                <OpenInOCI route={`compute/instances/${instance.id}`} />
                <ActionPanel.Section>
                  {instance.lifecycleState === Instance.LifecycleState.Running && (
                    <>
                      <Action icon={Icon.Redo} title="Reboot" onAction={() => doInstanceAction(instance, "RESET")} />
                      <Action icon={Icon.Stop} title="Stop" onAction={() => doInstanceAction(instance, "STOP")} />
                    </>
                  )}
                  {instance.lifecycleState === Instance.LifecycleState.Stopped && (
                    <Action icon={Icon.Play} title="Start" onAction={() => doInstanceAction(instance, "START")} />
                  )}
                  {![Instance.LifecycleState.Terminated, Instance.LifecycleState.Terminating].includes(
                    instance.lifecycleState,
                  ) && (
                    <Action
                      icon={Icon.Trash}
                      title="Terminate"
                      onAction={() => confirmAndTerminate(instance)}
                      style={Action.Style.Destructive}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ListInstanceVnicAttachments({
  instanceId,
  provider,
}: {
  instanceId: string;
  provider: common.ConfigFileAuthenticationDetailsProvider;
}) {
  const { isLoading, data: VNICs } = useCachedPromise(
    async () => {
      const computeClient = new core.ComputeClient({ authenticationDetailsProvider: provider });
      const VNICs = await computeClient.listVnicAttachments({ compartmentId: provider.getTenantId(), instanceId });
      return VNICs.items;
    },
    [],
    { initialData: [], onError },
  );

  return (
    <List navigationTitle="Core > Instances > VNIC" isLoading={isLoading}>
      {VNICs.map((vnic) => (
        <List.Item
          key={vnic.id}
          title={vnic.displayName ?? ""}
          subtitle={vnic.availabilityDomain}
          accessories={[{ date: new Date(vnic.timeCreated) }]}
          actions={
            <ActionPanel>
              {vnic.vnicId && (
                <Action.Push
                  icon={Icon.Eye}
                  title="View VNIC"
                  target={<ViewVnic vnicId={vnic.vnicId} provider={provider} />}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewVnic({ vnicId, provider }: { vnicId: string; provider: common.ConfigFileAuthenticationDetailsProvider }) {
  const { isLoading, data: vnic } = useCachedPromise(
    async () => {
      const vnicClient = new core.VirtualNetworkClient({ authenticationDetailsProvider: provider });
      const res = await vnicClient.getVnic({ vnicId });
      return res.vnic;
    },
    [],
    { onError },
  );

  const markdown = mapObjectToMarkdownTable(`VNIC: ${vnicId}`, vnic);
  return (
    <Detail
      navigationTitle="Core > Instances > VNIC Attachment > VNIC"
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {vnic?.privateIp && <Action.CopyToClipboard title="Copy Private IP to Clipboard" content={vnic.privateIp} />}
          {vnic?.publicIp && <Action.CopyToClipboard title="Copy Public IP to Clipboard" content={vnic.publicIp} />}
        </ActionPanel>
      }
    />
  );
}
