import { useEffect, useState } from "react";
import { getResellerIPInformation, getResellerIPs } from "./utils/api";
import { Action, ActionPanel, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { ErrorResponse, GetResellerIPInformationResponse, GetResellerIPsResponse } from "./types";
import ErrorComponent from "./components/ErrorComponent";

export default function ResellerIPs() {
  const [isLoading, setIsLoading] = useState(true);
  const [resellerIPs, setResellerIPs] = useState<string[]>();
  const [error, setError] = useState<ErrorResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getResellerIPs();
    if (response.error === "0") {
      const data = response as GetResellerIPsResponse;
      const { list } = data;
      setResellerIPs(list);
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Reseller IPs`);
    } else if (response.error === "1") setError(response as ErrorResponse);
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading}>
      {resellerIPs &&
        resellerIPs.map((ip) => (
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
  const [isLoading, setIsLoading] = useState(true);
  const [resellerIPInfo, setResellerIPInfo] = useState<GetResellerIPInformationResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getResellerIPInformation(ip);
    if (response.error === "0") {
      const data = response as GetResellerIPInformationResponse;
      setResellerIPInfo(data);

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched Reseller IP Information`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

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
