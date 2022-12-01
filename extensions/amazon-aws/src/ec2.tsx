import { DescribeInstancesCommand, EC2Client, Instance } from "@aws-sdk/client-ec2";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./util/aws-profile-dropdown";

export default function EC2() {
  const { data: instances, error, isLoading, revalidate } = useCachedPromise(fetchEC2Instances);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter instances by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        instances?.map((i) => <EC2Instance key={i.InstanceId} instance={i} />)
      )}
    </List>
  );
}

function EC2Instance(props: { instance: Instance }) {
  const instance = props.instance;
  const name = instance.Tags?.find((t) => t.Key === "Name")?.Value?.replace(/-/g, " ");

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
      subtitle={instance.InstanceType}
      icon="ec2.png"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://" +
              process.env.AWS_REGION +
              ".console.aws.amazon.com/ec2/v2/home?region=" +
              process.env.AWS_REGION +
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

async function fetchEC2Instances(token?: string, accInstances?: Instance[]): Promise<Instance[]> {
  const { NextToken, Reservations } = await new EC2Client({}).send(new DescribeInstancesCommand({ NextToken: token }));
  const instances = (Reservations || []).reduce<Instance[]>(
    (acc, reservation) => [...acc, ...(reservation.Instances || [])],
    []
  );
  const combinedInstances = [...(accInstances || []), ...instances];

  if (NextToken) {
    return fetchEC2Instances(NextToken, combinedInstances);
  }

  return combinedInstances;
}
