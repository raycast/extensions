import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { address } from "ip";
import { useState } from "react";

import LookUp from "./lookup";
import Torrent from "./torrent";
import { headers } from "./util";

export default function Command() {
  const { pop } = useNavigation();
  const [localIp] = useState(() => address("public", "ipv4").toString());

  const {
    isLoading: isLoadingIPV6,
    data: ipv6,
    error: errorIPV6,
    revalidate: revalidateIPV6,
  } = useFetch<string>("https://api64.ipify.org", {
    headers,
    keepPreviousData: true,
  });
  const {
    isLoading: isLoadingIPV4,
    data: ipv4,
    error: errorIPV4,
    revalidate: revalidateIPV4,
  } = useFetch<string>("https://api.ipify.org", {
    headers,
    keepPreviousData: true,
  });

  const revalidate = () => {
    revalidateIPV6();
    revalidateIPV4();
  };

  return (
    <List isLoading={isLoadingIPV6 || isLoadingIPV4}>
      <List.Item
        icon={Icon.Desktop}
        title={localIp}
        actions={
          !!localIp && (
            <ActionPanel>
              <Action.CopyToClipboard
                content={localIp}
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
          )
        }
        accessories={[
          {
            text: "Local IP address",
          },
        ]}
      />
      <List.Item
        subtitle={!ipv6 && isLoadingIPV6 ? "Loading..." : errorIPV6 ? "Failed to load" : undefined}
        icon={Icon.Globe}
        title={ipv6 || "Loading..."}
        actions={
          !isLoadingIPV6 && !!ipv6 ? (
            <ActionPanel>
              <Action.CopyToClipboard
                content={ipv6}
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
      {!isLoadingIPV4 && !errorIPV4 && !!ipv4 ? (
        <List.Item
          subtitle={ipv4 === "" ? "Loading..." : errorIPV4 ? "Failed to load" : undefined}
          icon={Icon.Globe}
          title={ipv4 || "Loading..."}
          actions={
            !isLoadingIPV4 && !!ipv4 ? (
              <ActionPanel>
                <Action.CopyToClipboard
                  content={ipv4}
                  onCopy={() => {
                    pop();
                  }}
                />
              </ActionPanel>
            ) : null
          }
          accessories={[
            {
              text: "Public IP address (IPV4)",
            },
          ]}
        />
      ) : null}
      {!isLoadingIPV6 && !errorIPV6 && !!ipv6 ? (
        <>
          <List.Item
            icon={ipv6 === "" ? "" : Icon.Eye}
            title=""
            subtitle="IP Lookup"
            actions={
              <ActionPanel>
                <Action.Push title="IP Lookup" target={<LookUp ip={ipv6} />} icon={Icon.Eye} />
              </ActionPanel>
            }
            accessories={[
              {
                text: "Details of the public IP address",
              },
            ]}
          />
          <List.Item
            icon={ipv6 === "" ? "" : Icon.Download}
            title=""
            subtitle="Torrent History"
            actions={
              <ActionPanel>
                <Action.Push title="Torrent History" target={<Torrent ip={ipv6} />} icon={Icon.Download} />
              </ActionPanel>
            }
            accessories={[
              {
                text: "Torrent download history of the public IP address",
              },
            ]}
          />
        </>
      ) : null}
    </List>
  );
}
