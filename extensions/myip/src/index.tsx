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

  const { isLoading, data, error, revalidate } = useFetch<string>("https://api64.ipify.org", {
    headers,
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading}>
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
        </>
      ) : null}
    </List>
  );
}
