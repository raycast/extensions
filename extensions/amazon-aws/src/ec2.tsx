import { DescribeInstancesCommand, EC2Client, Instance } from "@aws-sdk/client-ec2";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { AWS_URL_BASE } from "./constants";

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
      id={instance.InstanceId}
      key={instance.InstanceId}
      title={name || ""}
      icon={"aws-icons/ec2.png"}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`${AWS_URL_BASE}/ec2/v2/home?region=${process.env.AWS_REGION}#InstanceDetails:instanceId=${instance.InstanceId}`}
          />
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
  if (!process.env.AWS_PROFILE) return [];
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
