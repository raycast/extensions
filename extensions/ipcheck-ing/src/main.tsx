import { ActionPanel, List, Action, Icon, showToast, Toast, Clipboard, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { getLocalIPs, isLocalIPAddress } from "./getLocalIPs";
import { getExternalIP } from "./getExternalIP";
import { getIPDetails } from "./getIPDetails";

interface IPData {
  ip: string;
  source: string;
}

interface IPDetails {
  [key: string]: string;
}

export default function Command() {
  const localIPs = getLocalIPs();
  const [externalIPs, setExternalIPs] = useState<IPData[]>([]); // 明确指定数组中的对象类型
  const [ipDetails, setIpDetails] = useState<IPDetails>({}); // 添加索引签名

  useEffect(() => {
    const fetchIPs = async () => {
      const sources = ["1", "2", "3", "4", "5"]; // Fetch from multiple sources
      const ipRequests = sources.map((source) => getExternalIP(source));

      try {
        const results = await Promise.allSettled(ipRequests);
        const ipsData = results
          .filter(
            (result): result is PromiseFulfilledResult<IPData> =>
              result.status === "fulfilled" && result.value !== undefined,
          )
          .map((result) => result.value);

        ipsData.forEach((ipData) => {
          if (ipData) {
            getIPDetails(ipData.ip).then((details) =>
              setIpDetails((current) => ({ ...current, [ipData.ip]: details })),
            );
          }
        });
        setExternalIPs(ipsData); // Update externalIPs
      } catch (error) {
        console.error("Error managing IP fetch results:", error);
      }
    };

    fetchIPs();
    localIPs.ipv4.concat(localIPs.ipv6).forEach((ipInfo) => {
      if (isLocalIPAddress(ipInfo.address)) {
        setIpDetails((current) => ({ ...current, [ipInfo.address]: "Local IP" }));
      } else {
        getIPDetails(ipInfo.address).then((details) =>
          setIpDetails((current) => ({ ...current, [ipInfo.address]: details })),
        );
      }
    });
  }, []);

  const copyIPToClipboard = async (ip: string) => {
    await Clipboard.copy(ip);
    await showToast(Toast.Style.Success, "IP Copied", ip);
  };

  return (
    <List isLoading={!externalIPs.length} searchBarPlaceholder="Filter IPs or other details">
      {[...localIPs.ipv4, ...localIPs.ipv6].map((ipInfo, index) => {
        const detailText = ipDetails[ipInfo.address] || "Local IP";
        const keywords = [ipInfo.address, ipInfo.interface, ...detailText.split(/[,\s.]+/).filter(Boolean)];

        return (
          <List.Item
            key={index}
            icon={Icon.Network}
            title={`${ipInfo.address} ⬅︎ ${ipInfo.interface}`}
            accessories={[{ text: detailText }]}
            keywords={keywords}
            actions={
              <ActionPanel>
                <Action title="Copy to Clipboard" onAction={() => copyIPToClipboard(ipInfo.address)} />
              </ActionPanel>
            }
          />
        );
      })}
      {externalIPs.map((ipData, index) => {
        const detailText = ipDetails[ipData.ip] || "Loading Geo...";
        const keywords = [ipData.ip, ipData.source, ...detailText.split(/[,\s.]+/).filter(Boolean)];

        return (
          <List.Item
            key={index}
            icon={Icon.Globe}
            title={`${ipData.ip} ⬅︎ ${ipData.source}`}
            accessories={[{ text: detailText }]}
            keywords={keywords}
            actions={
              <ActionPanel>
                <Action title="Copy to Clipboard" onAction={() => copyIPToClipboard(ipData.ip)} />
              </ActionPanel>
            }
          />
        );
      })}
      <List.Item
        icon={Icon.ArrowNe}
        title="Get more info from IPCheck.ing"
        keywords={["IPCheck", "More Info", "Website"]}
        actions={
          <ActionPanel>
            <Action title="Get More Details" onAction={() => open("https://ipcheck.ing")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
