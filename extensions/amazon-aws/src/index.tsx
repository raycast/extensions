import {
  getPreferenceValues,
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import AWS from "aws-sdk";

interface Preferences {
  region: string;
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export default function DescribeInstances() {
  const preferences: Preferences = getPreferenceValues();
  AWS.config.update({ region: preferences.region });
  const ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });
  const params = { DryRun: false };

  const [state, setState] = useState<{ instances: AWS.EC2.Instance[]; loaded: boolean; hasError: boolean }>({
    instances: [],
    loaded: false,
    hasError: false,
  });

  useEffect(() => {
    async function fetch() {
      ec2.describeInstances(params, (err, data) => {
        if (err) {
          setState({
            hasError: true,
            loaded: false,
            instances: [],
          });
        } else {
          setState({
            hasError: false,
            loaded: true,
            instances:
              data.Reservations?.map((r) => r.Instances)
                .filter(notEmpty)
                .flat() || [],
          });
        }
      });
    }
    fetch();
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

  return (
    <List.Item
      id={instance.InstanceId}
      key={instance.InstanceId}
      title={name || "Unknown Instance name"}
      subtitle={instance.InstanceType + " (" + instance.PublicIpAddress + " / " + instance.PrivateIpAddress + ")"}
      icon="list-icon.png"
      accessoryTitle={instance.LaunchTime ? instance.LaunchTime.toLocaleDateString() : undefined}
      actions={
        <ActionPanel>
          <OpenInBrowserAction
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
          <CopyToClipboardAction title="Copy Public IP" content={instance.PublicIpAddress || ""} />
          <CopyToClipboardAction title="Copy Private IP" content={instance.PrivateIpAddress || ""} />
        </ActionPanel>
      }
    />
  );
}
