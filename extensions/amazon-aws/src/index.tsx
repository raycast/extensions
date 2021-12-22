import { getPreferenceValues, ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
var AWS = require('aws-sdk');

interface Preferences {
  region: string;
}

export default function DescribeInstances() {
  const preferences: Preferences = getPreferenceValues();
  AWS.config.update({region: preferences.region});
  var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
  var params = {DryRun: false};
  
  const [state, setState] = useState<{ instances: Instance[], loaded: boolean, hasError: boolean }>({ instances: [], loaded: false, hasError: false });

  useEffect(() => {
    async function fetch() {
      ec2.describeInstances(params, function(err: { stack: any; }, data: any) {
        if (err) {
          setState(oldstate => ({
            hasError: true,
            loaded: false,
            instances: []
          }));
        } else {
          setState(oldstate => ({
            hasError: false,
            loaded: true,
            instances: data.Reservations.map((r: any) => r.Instances).flat()
          }));
        }
      });
    }
    fetch();
  }, []);

  if (state.hasError) {
    return (<Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />)
  }

  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter instances by name...">
      {state.instances.map((i) => (
        <InstanceListItem key={i.InstanceId} instance={i} />
      ))}
    </List>
  );
}

function InstanceListItem(props: { instance: Instance }) {
  const instance = props.instance;
  let name = instance.Tags.filter((t: { Key: string; Value: string; }) => t.Key === 'Name').pop().Value
    .replaceAll('-', ' ');
  const preferences: Preferences = getPreferenceValues();

  return (
    <List.Item
      id={instance.InstanceId}
      key={instance.InstanceId}
      title={name}
      subtitle={instance.InstanceType + " (" + instance.PublicIpAddress + " / " + instance.PrivateIpAddress + ")"} 
      icon="list-icon.png"
      accessoryTitle={new Date(instance.LaunchTime).toLocaleDateString()}
      actions={
        <ActionPanel>
          <OpenInBrowserAction title="Open in Browser" url={
            "https://" +
            preferences.region +
            ".console.aws.amazon.com/ec2/v2/home?region=" +
            preferences.region +
            "#InstanceDetails:instanceId=" +
            instance.InstanceId
          } />
          <CopyToClipboardAction title="Copy Public IP" content={instance.PublicIpAddress} />
          <CopyToClipboardAction title="Copy Private IP" content={instance.PrivateIpAddress} />
        </ActionPanel>
      }
    />
  );
}

type Instance = {
  InstanceId: string;
  InstanceType: string;
  Name: string;
  Tags: any;
  PublicIpAddress: string;
  PrivateIpAddress: string;
  LaunchTime: string;
};
