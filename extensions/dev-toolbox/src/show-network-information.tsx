import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import os from "os";
import axios from "axios";

interface NetworkInfo {
  interface: string;
  ipv4?: string;
  ipv6?: string;
  mac?: string;
  netmask?: string;
  family?: string;
  internal?: boolean;
  cidr?: string | null;
}

interface IPDetails {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  timezone?: string;
}

export default function NetworkInfo() {
  const [info, setInfo] = useState<NetworkInfo[]>([]);
  const [publicIP, setPublicIP] = useState<{ v4?: IPDetails; v6?: IPDetails }>({});

  useEffect(() => {
    const interfaces = os.networkInterfaces();
    const networkData: NetworkInfo[] = [];

    Object.entries(interfaces).forEach(([name, details]) => {
      details?.forEach((detail) => {
        if (!detail.internal) {
          networkData.push({
            interface: name,
            ipv4: detail.family === "IPv4" ? detail.address : undefined,
            ipv6: detail.family === "IPv6" ? detail.address : undefined,
            mac: detail.mac,
            netmask: detail.netmask,
            family: detail.family,
            internal: detail.internal,
            cidr: detail.cidr,
          });
        }
      });
    });

    setInfo(networkData);

    const fetchIPDetails = async (ip: string) => {
      try {
        const response = await axios.get(`https://ipinfo.io/${ip}/json`);
        return response.data;
      } catch (error) {
        console.error("Failed to fetch IP details:", error);
        return { ip };
      }
    };

    Promise.all([axios.get("https://api.ipify.org?format=json"), axios.get("https://api64.ipify.org?format=json")])
      .then(async ([res4, res6]) => {
        const [v4Details, v6Details] = await Promise.all([fetchIPDetails(res4.data.ip), fetchIPDetails(res6.data.ip)]);
        setPublicIP({ v4: v4Details, v6: v6Details });
      })
      .catch(() => {
        showToast({ style: Toast.Style.Failure, title: "Failed to get public IP" });
      });
  }, []);

  const renderIPSection = (title: string, details?: IPDetails) => {
    if (!details) return null;
    return (
      <List.Item
        title={title}
        subtitle={details.ip}
        accessories={[
          { text: details.hostname || "" },
          { text: details.city || "" },
          { text: details.country || "" },
          { text: details.org || "" },
        ]}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="IP Address" text={details.ip} />
                <List.Item.Detail.Metadata.Label title="Hostname" text={details.hostname} />
                <List.Item.Detail.Metadata.Label
                  title="Location"
                  text={`${details.city || ""}, ${details.region || ""}, ${details.country || ""}`}
                />
                <List.Item.Detail.Metadata.Label title="Coordinates" text={details.loc} />
                <List.Item.Detail.Metadata.Label title="Organization" text={details.org} />
                <List.Item.Detail.Metadata.Label title="Timezone" text={details.timezone} />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={details.ip} title="Copy Ip" />
            <Action.CopyToClipboard content={JSON.stringify(details, null, 2)} title="Copy All Details" />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List>
      <List.Section title="Public IP Addresses">
        {renderIPSection("Public IPv4", publicIP.v4)}
        {renderIPSection("Public IPv6", publicIP.v6)}
      </List.Section>

      <List.Section title="Network Interfaces">
        {info.map((iface, index) => (
          <List.Item
            key={`${iface.interface}-${index}`}
            title={iface.interface}
            subtitle={iface.family}
            accessories={[{ text: iface.ipv4 || iface.ipv6 || "" }, { text: iface.mac || "" }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Interface" text={iface.interface} />
                    <List.Item.Detail.Metadata.Label title="IP Address" text={iface.ipv4 || iface.ipv6 || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="MAC Address" text={iface.mac || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Netmask" text={iface.netmask || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="CIDR" text={iface.cidr || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Family" text={iface.family || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Internal" text={iface.internal ? "Yes" : "No"} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={iface.ipv4 || iface.ipv6 || ""}
                  title="Copy Ip"
                  shortcut={{ modifiers: ["cmd"], key: "1" }}
                />
                <Action.CopyToClipboard
                  content={iface.mac || ""}
                  title="Copy Mac Address"
                  shortcut={{ modifiers: ["cmd"], key: "2" }}
                />
                <Action.CopyToClipboard
                  content={JSON.stringify(iface, null, 2)}
                  title="Copy All Interface Details"
                  shortcut={{ modifiers: ["cmd"], key: "3" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
