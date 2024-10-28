import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import common = require("oci-common");
import * as core from "oci-core";
import { Instance } from "oci-core/lib/model";
import { useState } from "react";

export default function Core() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const { isLoading, data: instances } = useCachedPromise(
    async () => {
      const provider: common.ConfigFileAuthenticationDetailsProvider = new common.ConfigFileAuthenticationDetailsProvider();
      const computeClient = new core.ComputeClient({  authenticationDetailsProvider: provider });
      const instances = await computeClient.listInstances({ compartmentId: provider.getTenantId() });
      return instances.items;
    }, [], { initialData: [] }
  )

  function getInstanceColor(state: Instance.LifecycleState) {
    switch (state) {
      case core.models.Instance.LifecycleState.Running: return Color.Green;
      case core.models.Instance.LifecycleState.Stopped: return Color.Yellow;
      case core.models.Instance.LifecycleState.Provisioning: return Color.Blue;
      case core.models.Instance.LifecycleState.Stopping:
      case core.models.Instance.LifecycleState.Terminating: return Color.Orange;
      case core.models.Instance.LifecycleState.Terminated: return Color.Red;
      default: return undefined;
    }
  }

return <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search instances">
  {instances.map(instance => {
    const accessories: List.Item.Accessory[] = [];
    if (instance.systemTags && instance.systemTags["orcl-cloud"]["free-tier-retained"]==="true") accessories.push({tag: "Always Free"});

    const markdown = `## Shape Config \n\n
| - | - |
|---|---|
${Object.entries(instance.shapeConfig ?? {}).map(([key, val]) => `| ${key} | ${val} |`).join(`\n`)}`;

    return <List.Item key={instance.id} icon={{ source: Icon.CircleFilled, tintColor: getInstanceColor(instance.lifecycleState) }} title={instance.displayName ?? ""} subtitle={isShowingDetail ? undefined : instance.shape} accessories={isShowingDetail ? undefined : accessories} detail={<List.Item.Detail markdown={markdown} metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Availability Domain" text={instance.availabilityDomain} />
      <List.Item.Detail.Metadata.Label title="Compartment ID" text={instance.compartmentId} />
      <List.Item.Detail.Metadata.Label title="ID" text={instance.id} />
      <List.Item.Detail.Metadata.TagList title="Lifecycle State">
        <List.Item.Detail.Metadata.TagList.Item text={instance.lifecycleState} color={getInstanceColor(instance.lifecycleState)} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Region" text={instance.region} />
      <List.Item.Detail.Metadata.Label title="Shape" text={instance.shape} />
      <List.Item.Detail.Metadata.Label title="Time Created" text={instance.timeCreated.toString()} />
    </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
      <Action icon={Icon.AppWindowSidebarLeft} title="Toggle Details" onAction={() => setIsShowingDetail(prev => !prev)} />
    </ActionPanel>} />
  })}
</List>
}