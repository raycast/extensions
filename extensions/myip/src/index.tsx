import { ActionPanel, CopyToClipboardAction, Icon, List, PushAction, useNavigation } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import LookUp from "./lookup";
import Torrent from "./torrent";

export type LoadingStatus = "loading" | "success" | "failure";

export default function Command() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [ip, setIp] = useState("");
  const { pop } = useNavigation();

  useEffect(() => {
    async function getIp() {
      try {
        const { data } = await axios.get("http://api64.ipify.org");
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
        icon={ip === "" ? "" : Icon.Globe}
        title={ip}
        accessoryTitle="My public IP address"
        actions={
          status === "success" && (
            <ActionPanel>
              <CopyToClipboardAction
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
            subtitle="IP Lookup"
            accessoryTitle="Details of the IP"
            actions={
              <ActionPanel>
                <PushAction title="IP Lookup" target={<LookUp />} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={ip === "" ? "" : Icon.Download}
            title=""
            subtitle="Torrent History"
            accessoryTitle="Torrent download history of the IP"
            actions={
              <ActionPanel>
                <PushAction title="Torrent History" target={<Torrent ip={ip} />} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
