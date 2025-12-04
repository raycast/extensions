import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { address } from "ip";

export type LoadingStatus = "loading" | "success" | "failure";

export default function Command() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [ip, setIp] = useState("");
  const { pop } = useNavigation();
  const [localIp] = useState(() => address("public", "ipv4").toString());

  useEffect(() => {
    const regex = /ipCallback\(\{ip:"([\d.]+)"\}\)/;
    async function getIp() {
      try {
        const { data } = await axios.get("https://www.taobao.com/help/getip.php");
        if (data === "") {
          throw new Error("empty response");
        }
        const match = data.match(regex);
        if (!match) {
          setIp("Failure, Your IP is not a Chinese IP.");
        } else {
          const ipAddress = match[1];
          setIp(ipAddress);
        }
        setStatus("success");
      } catch (error) {
        setIp("Failure, Your IP is not a Chinese IP.");
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
        actions={
          !!localIp && (
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
        accessories={[
          {
            text: "Local IP address",
          },
        ]}
      />
      <List.Item
        subtitle={ip === "" ? "Loading..." : ""}
        icon={Icon.Globe}
        title={ip}
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
        accessories={[
          {
            text: "Public IP address",
          },
        ]}
      />
    </List>
  );
}
