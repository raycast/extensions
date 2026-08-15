import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import ErrorComponent from "./components/ErrorComponent";
import InvalidUrlComponent from "./components/InvalidUrlComponent";
import { isInvalidUrl } from "./utils/functions";
import { useGetResellerIPInformation, useGetResellerIPs } from "./utils/hooks";

export default function ResellerIPs() {
  if (isInvalidUrl()) return <InvalidUrlComponent />;

  const { isLoading, data: resellerIPs = [], error } = useGetResellerIPs();

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search ip">
      {resellerIPs.map((ip) => (
        <List.Item
          key={ip}
          title={ip}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.Push
                title="Get Detailed Information"
                icon={Icon.Info}
                target={<GetResellerIPInformation ip={ip} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type GetResellerIPInformationProps = {
  ip: string;
};
function GetResellerIPInformation({ ip }: GetResellerIPInformationProps) {
  const { isLoading, data: resellerIPInfo } = useGetResellerIPInformation(ip);

  return (
    <Detail
      navigationTitle="Get Reseller IP Information"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify({ ip, ...resellerIPInfo })} />
        </ActionPanel>
      }
      markdown={`## IP: ${ip}`}
      metadata={
        !resellerIPInfo ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Gateway"
              text={resellerIPInfo.gateway || undefined}
              icon={resellerIPInfo.gateway ? undefined : Icon.Minus}
            />
            <Detail.Metadata.Label title="Global" icon={resellerIPInfo.global === "yes" ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.Label title="Netmask" text={resellerIPInfo.netmask} />
            <Detail.Metadata.Label
              title="NS"
              text={resellerIPInfo.ns || undefined}
              icon={resellerIPInfo.ns ? undefined : Icon.Minus}
            />
            <Detail.Metadata.Label title="Reseller" text={resellerIPInfo.reseller} />
            <Detail.Metadata.Label title="Status" text={resellerIPInfo.status} />
            <Detail.Metadata.Label title="Value" text={resellerIPInfo.value} />
          </Detail.Metadata>
        )
      }
    />
  );
}
