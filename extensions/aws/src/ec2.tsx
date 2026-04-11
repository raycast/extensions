import {
  DescribeInstancesCommand,
  EC2Client,
  Instance,
  StartInstancesCommand,
  StopInstancesCommand,
} from "@aws-sdk/client-ec2";
import { ActionPanel, List, Action, Icon, Color, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import AwsMfaRoleDropdown from "./components/searchbar/aws-mfa-role-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { MfaPrompt, useMfaGuard } from "./components/MfaPrompt";

export default function EC2() {
  const { needsMfa, isLoading: mfaLoading, activeRole, revalidate: revalidateMfa } = useMfaGuard();
  const canManageInstances = activeRole === "developer-npn";
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data: instances, error, isLoading, revalidate } = useCachedPromise(fetchEC2Instances);

  if (mfaLoading) {
    return <List isLoading={true} />;
  }

  if (needsMfa) {
    return (
      <MfaPrompt
        roleId={activeRole}
        onSuccess={() => {
          revalidateMfa();
          revalidate();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Filter instances by name..."
      searchBarAccessory={<AwsMfaRoleDropdown onRoleSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        instances?.map((i) => (
          <EC2Instance
            key={i.InstanceId}
            instance={i}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail(!isShowingDetail)}
            canManageInstances={canManageInstances}
            revalidate={revalidate}
          />
        ))
      )}
    </List>
  );
}

function EC2Instance({
  instance,
  isShowingDetail,
  onToggleDetail,
  canManageInstances,
  revalidate,
}: {
  instance: Instance;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  canManageInstances: boolean;
  revalidate: () => void;
}) {
  const name = instance.Tags?.find((t) => t.Key === "Name")?.Value;
  const isRunning = instance.State?.Name === "running";
  const isStopped = instance.State?.Name === "stopped";
  const isTransitional = ["pending", "stopping", "shutting-down"].includes(instance.State?.Name || "");

  const startInstance = async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Starting instance..." });
      await new EC2Client({}).send(new StartInstancesCommand({ InstanceIds: [instance.InstanceId!] }));
      await showToast({ style: Toast.Style.Success, title: "Instance starting", message: name || instance.InstanceId });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start instance",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const stopInstance = async () => {
    const confirmed = await confirmAlert({
      title: "Stop Instance",
      message: `Are you sure you want to stop ${name || instance.InstanceId}?`,
      primaryAction: {
        title: "Stop",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Stopping instance..." });
      await new EC2Client({}).send(new StopInstancesCommand({ InstanceIds: [instance.InstanceId!] }));
      await showToast({ style: Toast.Style.Success, title: "Instance stopping", message: name || instance.InstanceId });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop instance",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List.Item
      key={instance.InstanceId}
      title={name || ""}
      icon={"aws-icons/ec2.png"}
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Instance ID" text={instance.InstanceId || "-"} />
                <List.Item.Detail.Metadata.Label title="Name" text={name || "-"} />
                <List.Item.Detail.Metadata.Label title="Platform" text={instance.Platform || "Linux"} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="State" text={instance.State?.Name || "-"} />
                <List.Item.Detail.Metadata.Label
                  title="Launch Time"
                  text={instance.LaunchTime ? new Date(instance.LaunchTime).toLocaleString() : "-"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Private IP" text={instance.PrivateIpAddress || "-"} />
                <List.Item.Detail.Metadata.Label title="Public IP" text={instance.PublicIpAddress || "-"} />
                <List.Item.Detail.Metadata.Label title="VPC ID" text={instance.VpcId || "-"} />
                <List.Item.Detail.Metadata.Label title="Subnet ID" text={instance.SubnetId || "-"} />
                <List.Item.Detail.Metadata.Label
                  title="Availability Zone"
                  text={instance.Placement?.AvailabilityZone || "-"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Instance Type" text={instance.InstanceType || "-"} />
                <List.Item.Detail.Metadata.Label title="Key Name" text={instance.KeyName || "-"} />
                <List.Item.Detail.Metadata.Label
                  title="IAM Role"
                  text={instance.IamInstanceProfile?.Arn?.split("/").pop() || "-"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Security Groups"
                  text={instance.SecurityGroups?.map((sg) => sg.GroupName).join(", ") || "-"}
                />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
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
          {canManageInstances && isStopped && !isTransitional && (
            <Action
              title="Start Instance"
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={startInstance}
            />
          )}
          {canManageInstances && isRunning && !isTransitional && (
            <Action
              title="Stop Instance"
              icon={Icon.Stop}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              style={Action.Style.Destructive}
              onAction={stopInstance}
            />
          )}
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
        </ActionPanel>
      }
      accessories={[
        { icon: getStateIcon(instance.State?.Name), tooltip: `State: ${instance.State?.Name || "unknown"}` },
        { text: instance.InstanceType, tooltip: "Instance Type" },
        { text: instance.Platform || "Linux", tooltip: "Platform" },
        {
          text: instance.Placement?.AvailabilityZone?.slice(0, -1) || "-",
          tooltip: "Region",
        },
      ]}
    />
  );
}

function getStateIcon(state: string | undefined): { source: Icon; tintColor: Color } {
  switch (state) {
    case "running":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "stopped":
      return { source: Icon.CircleFilled, tintColor: Color.Red };
    case "pending":
    case "stopping":
    case "shutting-down":
      return { source: Icon.CircleFilled, tintColor: Color.Yellow };
    case "terminated":
    default:
      return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };
  }
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
