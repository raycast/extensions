/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import common = require("oci-common");
import * as core from "oci-core";
import { Instance } from "oci-core/lib/model";
import { mapObjectToMarkdownTable } from "./utils";
import { containerinstances } from "oci-sdk";

const onError = (error: Error) => {
  const err = error.message as string | common.OciError;
  const title = "ERROR";
  const message = err instanceof common.OciError ? err.message : err;
  showFailureToast(message, { title });
};

export default function CheckProvider() {
  try {
    new common.ConfigFileAuthenticationDetailsProvider();
    return <Core />
  } catch (error) {
    return <Detail navigationTitle="Oracle Cloud - Provider Error" markdown={`## Error: \n\n Can't load the default config from \`~/.oci/config\` or \`~/.oraclebmc/config\` because it does not exists or it's not a file. For more info about config file and how to get required information, see https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm for more info on OCI configuration files. \n\n > TIP: Check extension README!`} actions={<ActionPanel>
      <Action.OpenInBrowser icon={getFavicon("https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm", { fallback: Icon.Globe })} url="https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm" />
    </ActionPanel>} />
  }
}

function Core() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-instance-details", false);
  
  const { isLoading, data: instances } = useCachedPromise(
    async () => {
      const provider = new common.ConfigFileAuthenticationDetailsProvider();
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
      case core.models.Instance.LifecycleState.Stopping:
      case core.models.Instance.LifecycleState.Terminating:
        return Color.Orange;
      case core.models.Instance.LifecycleState.Terminated:
        return Color.Red;
      default:
        return undefined;
    }
  }

  async function rebootInstance(instance: Instance) {
    const toast = await showToast(Toast.Style.Animated, "Rebooting", `${instance.displayName}`);
    try {
      const provider = new common.ConfigFileAuthenticationDetailsProvider();
      const containerinstancesClient = new containerinstances.ContainerInstanceClient({ authenticationDetailsProvider: provider });
      await containerinstancesClient.restartContainerInstance({
        containerInstanceId: "instance.id"
      });
      toast.style = Toast.Style.Success;
      toast.title = "Reboooted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Reboot failed";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search instances">
      {instances.map((instance) => {
        const accessories: List.Item.Accessory[] = [];
        if (instance.systemTags && instance.systemTags["orcl-cloud"]?.["free-tier-retained"] === "true")
          accessories.push({ tag: "Always Free" });

        const markdown = mapObjectToMarkdownTable("## Shape Config", instance.shapeConfig);

        return (
          <List.Item
            key={instance.id}
            icon={{ source: Icon.CircleFilled, tintColor: getInstanceColor(instance.lifecycleState) }}
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
                  target={<ListInstanceVnicAttachments instanceId={instance.id} />}
                />
                <ActionPanel>
                  <Action icon={Icon.Redo} title="Reboot" onAction={() => rebootInstance(instance)} />
                </ActionPanel>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ListInstanceVnicAttachments({ instanceId }: { instanceId: string }) {
  const { isLoading, data: VNICs } = useCachedPromise(
    async () => {
      const provider = new common.ConfigFileAuthenticationDetailsProvider();
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
                <Action.Push icon={Icon.Eye} title="View VNIC" target={<ViewVnic vnicId={vnic.vnicId} />} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewVnic({ vnicId }: { vnicId: string }) {
  const { isLoading, data: vnic } = useCachedPromise(
    async () => {
      const provider = new common.ConfigFileAuthenticationDetailsProvider();
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
