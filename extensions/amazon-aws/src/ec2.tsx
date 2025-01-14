import { DescribeInstancesCommand, EC2Client, Instance } from "@aws-sdk/client-ec2";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

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

function EC2Instance({ instance }: { instance: Instance }) {
  const name = instance.Tags?.find((t) => t.Key === "Name")?.Value;

  return (
    <List.Item
      key={instance.InstanceId}
      title={name || ""}
      icon={"aws-icons/ec2.png"}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(instance.InstanceId, "AWS::EC2::Instance")} />
          <Action.CopyToClipboard title="Copy Instance ID" content={instance.InstanceId || ""} />
          {instance.PrivateIpAddress && (
            <Action.CopyToClipboard title="Copy Private IP" content={instance.PrivateIpAddress} />
          )}
          {instance.PublicIpAddress && (
            <Action.CopyToClipboard title="Copy Public IP" content={instance.PublicIpAddress} />
          )}
        </ActionPanel>
      }
      accessories={[{ text: instance.InstanceType }]}
    />
  );
}

async function fetchEC2Instances(token?: string, accInstances?: Instance[]): Promise<Instance[]> {
  if (!isReadyToFetch()) return [];
  const { NextToken, Reservations } = await new EC2Client({}).send(new DescribeInstancesCommand({ NextToken: token }));
  const instances = (Reservations || []).reduce<Instance[]>(
    (acc, reservation) => [...acc, ...(reservation.Instances || [])],
    [],
  );
  const combinedInstances = [...(accInstances || []), ...instances];

  if (NextToken) {
    return fetchEC2Instances(NextToken, combinedInstances);
  }

  return combinedInstances;
}
