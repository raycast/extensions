import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import LookUp from "./lookup";
import Torrent from "./torrent";
import { address } from "ip";

export type LoadingStatus = "loading" | "success" | "failure";

export default function Command() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [ip, setIp] = useState("");
  const { pop } = useNavigation();
  const localIp = address("public", "ipv4").toString();

  useEffect(() => {
    async function getIp() {
      try {
        const { data } = await axios.get("https://api64.ipify.org");
        setIp(data);
        setStatus("success");
      } catch (error) {
        setIp("Failure");
        setStatus("failure");
      }
    }
    getIp();
  }, []);

  return (
    <List isLoading={status === "loading"}>
      <List.Item
        icon={Icon.Desktop}
        title={localIp}
        accessoryTitle="local IP address"
        actions={
          status === "success" && (
            <ActionPanel>
              <Action.CopyToClipboard
                content={localIp}
                onCopy={() => {
                  pop();
                }}
              />
            </ActionPanel>
          )
        }
      />
      <List.Item
        subtitle={ip === "" ? "Loading..." : ""}
        icon={Icon.Globe}
        title={ip}
        accessoryTitle="public IP address"
        actions={
          status === "success" && (
            <ActionPanel>
              <Action.CopyToClipboard
                content={ip}
                onCopy={() => {
                  pop();
                }}
              />
            </ActionPanel>
          )
        }
      />
      {status === "success" && (
        <>
          <List.Item
            icon={ip === "" ? "" : Icon.Eye}
            title=""
            subtitle="Location Lookup"
            accessoryTitle="Details of the public IP address"
            actions={
              <ActionPanel>
                <Action.Push title="IP Lookup" target={<LookUp />} icon={Icon.Eye} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={ip === "" ? "" : Icon.Download}
            title=""
            subtitle="Torrent History"
            accessoryTitle="Torrent download history of the public IP address"
            actions={
              <ActionPanel>
                <Action.Push title="Torrent History" target={<Torrent ip={ip} />} icon={Icon.Download} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
