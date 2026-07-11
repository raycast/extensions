import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { networkInterfaces } from "os";
import { useState, useEffect } from "react";

import LookUp from "./lookup";
import Torrent from "./torrent";
import { headers } from "./util";

function getLocalIPs() {
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    const net = nets[name];
    if (net) {
      for (const netInfo of net) {
        if (netInfo.family === "IPv4" && !netInfo.internal) {
          results.push(netInfo.address);
        }
      }
    }
  }

  return results;
}

export default function Command() {
  const { pop } = useNavigation();
  const [localIps, setLocalIps] = useState<string[]>([]);

  useEffect(() => {
    setLocalIps(getLocalIPs());
  }, []);

  const { isLoading, data, error, revalidate } = useFetch<string>("https://api64.ipify.org", {
    headers,
    keepPreviousData: true,
  });

  // when api64 returns an IPv6 address (or any non-empty value), try to also fetch IPv4
  const [ipv4, setIpv4] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;

    async function fetchIpv4IfNeeded() {
      // only attempt when we have a value from api64 and it's not empty
      if (!data) {
        setIpv4(null);
        return;
      }

      try {
        // If the returned data already looks like an IPv4, no need to fetch api4
        const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(data.trim());
        if (isIpv4) {
          setIpv4(null);
          return;
        }

        const resp = await fetch("https://api4.ipify.org", { headers });
        if (!mounted) return;
        if (!resp.ok) {
          setIpv4(null);
          return;
        }
        const v4 = (await resp.text()).trim();
        // basic validation
        if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(v4)) {
          setIpv4(v4);
        } else {
          setIpv4(null);
        }
      } catch {
        if (mounted) setIpv4(null);
      }
    }

    fetchIpv4IfNeeded();

    return () => {
      mounted = false;
    };
  }, [data]);

  return (
    <List isLoading={isLoading}>
      {localIps.map((ip, index) => (
        <List.Item
          key={index}
          icon={Icon.Desktop}
          title={ip}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                content={ip}
                onCopy={() => {
                  pop();
                }}
              />
              <Action
                title="Refresh"
                onAction={() => revalidate()}
                icon={Icon.Repeat}
                shortcut={{ key: "r", modifiers: ["cmd"] }}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: `Local IP address ${index + 1}`,
            },
          ]}
        />
      ))}
      <List.Item
        subtitle={!data && isLoading ? "Loading..." : error ? "Failed to load" : undefined}
        icon={Icon.Globe}
        title={data || "Loading..."}
        actions={
          !isLoading && !!data ? (
            <ActionPanel>
              <Action.CopyToClipboard
                content={data}
                onCopy={() => {
                  pop();
                }}
              />
              <Action
                title="Refresh"
                onAction={() => revalidate()}
                icon={Icon.Repeat}
                shortcut={{ key: "r", modifiers: ["cmd"] }}
              />
            </ActionPanel>
          ) : null
        }
        accessories={[
          {
            text: "Public IP address",
          },
        ]}
      />
      {/* IPv4 fallback when api64 returned IPv6 */}
      {ipv4 ? (
        <List.Item
          subtitle={"Public IPv4 address"}
          icon={Icon.Globe}
          title={ipv4}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                content={ipv4}
                onCopy={() => {
                  pop();
                }}
              />
              <Action
                title="Refresh"
                onAction={() => revalidate()}
                icon={Icon.Repeat}
                shortcut={{ key: "r", modifiers: ["cmd"] }}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: "Public IP address",
            },
          ]}
        />
      ) : null}
      {!isLoading && !error && !!data ? (
        <>
          <List.Item
            icon={data === "" ? "" : Icon.Eye}
            title=""
            subtitle="IP Lookup"
            actions={
              <ActionPanel>
                <Action.Push title="IP Lookup" target={<LookUp ip={data} />} icon={Icon.Eye} />
              </ActionPanel>
            }
            accessories={[
              {
                text: "Details of the public IP address",
              },
            ]}
          />
          <List.Item
            icon={data === "" ? "" : Icon.Download}
            title=""
            subtitle="Torrent History"
            actions={
              <ActionPanel>
                <Action.Push title="Torrent History" target={<Torrent ip={data} />} icon={Icon.Download} />
              </ActionPanel>
            }
            accessories={[
              {
                text: "Torrent download history of the public IP address",
              },
            ]}
          />
          {/* If we also have an IPv4, show lookup/torrent for it too */}
          {ipv4 ? (
            <>
              <List.Item
                icon={Icon.Eye}
                title=""
                subtitle={`IP Lookup (IPv4)`}
                actions={
                  <ActionPanel>
                    <Action.Push title="IP Lookup" target={<LookUp ip={ipv4} />} icon={Icon.Eye} />
                  </ActionPanel>
                }
                accessories={[
                  {
                    text: "Details of the public IPv4 address",
                  },
                ]}
              />
              <List.Item
                icon={Icon.Download}
                title=""
                subtitle={`Torrent History (IPv4)`}
                actions={
                  <ActionPanel>
                    <Action.Push title="Torrent History" target={<Torrent ip={ipv4} />} icon={Icon.Download} />
                  </ActionPanel>
                }
                accessories={[
                  {
                    text: "Torrent download history of the public IPv4 address",
                  },
                ]}
              />
            </>
          ) : null}
        </>
      ) : null}
    </List>
  );
}
