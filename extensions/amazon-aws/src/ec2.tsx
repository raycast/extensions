import { getPreferenceValues, ActionPanel, List, Detail, Action } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import AWS from "aws-sdk";
import setupAws from "./util/setupAws";

setupAws();

interface Preferences {
  region: string;
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export default function DescribeInstances() {
  const ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });

  const [state, setState] = useState<{ instances: AWS.EC2.Instance[]; loaded: boolean; hasError: boolean }>({
    instances: [],
    loaded: false,
    hasError: false,
  });

  useEffect(() => {
    async function fetch(token?: string, accInstances?: AWS.EC2.Instance[]): Promise<AWS.EC2.Instance[]> {
      const { NextToken, Reservations } = await ec2.describeInstances({ NextToken: token }).promise();
      const instances = (Reservations || []).reduce<AWS.EC2.Instance[]>(
        (acc, reservation) => [...acc, ...(reservation.Instances || [])],
        []
      );
      const combinedInstances = [...(accInstances || []), ...instances];

      if (NextToken) {
        return fetch(NextToken, combinedInstances);
      }

      return combinedInstances.filter(notEmpty);
    }

    fetch()
      .then((instances) => setState({ instances, loaded: true, hasError: false }))
      .catch(() => setState({ instances: [], loaded: true, hasError: true }));
  }, []);

  if (state.hasError) {
    return (
      <Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter instances by name...">
      {state.instances.map((i) => (
        <InstanceListItem key={i.InstanceId} instance={i} />
      ))}
    </List>
  );
}

function InstanceListItem(props: { instance: AWS.EC2.Instance }) {
  const instance = props.instance;
  const name = instance.Tags?.find((t) => t.Key === "Name")?.Value?.replace(/-/g, " ");
  const preferences: Preferences = getPreferenceValues();

  const subtitle = useMemo(() => {
    return `${instance.InstanceType}`;
  }, [instance]);

  function getAccessories(): List.Item.Accessory[] {
    const _acc: List.Item.Accessory[] = [];
    _acc.push({
      icon: "🔒",
      text: instance.PrivateIpAddress,
      tooltip: "Private Ip Address",
    });
    if (instance.PublicIpAddress) {
      _acc.push({
        icon: "🌍",
        text: instance.PublicIpAddress,
        tooltip: "Public Ip Address",
      });
    }
    _acc.push({
      icon: "⏰",
      text: instance.LaunchTime ? instance.LaunchTime.toLocaleDateString() : undefined,
      tooltip: "Launch Time",
    });

    return _acc;
  }

  return (
    <List.Item
      id={instance.InstanceId}
      key={instance.InstanceId}
      title={name || "Unknown Instance name"}
      subtitle={subtitle}
      icon="list-icon.png"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://" +
              preferences.region +
              ".console.aws.amazon.com/ec2/v2/home?region=" +
              preferences.region +
              "#InstanceDetails:instanceId=" +
              instance.InstanceId
            }
          />
          <Action.CopyToClipboard title="Copy Private IP" content={instance.PrivateIpAddress || ""} />
          {instance.PublicIpAddress && (
            <Action.CopyToClipboard title="Copy Public IP" content={instance.PublicIpAddress} />
          )}
        </ActionPanel>
      }
      accessories={getAccessories()}
    />
  );
}
