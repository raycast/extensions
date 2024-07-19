import { ActionPanel, Action, List, showHUD } from "@raycast/api";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parseSSHConfig } from "./lib/ssh";
import { runAppleScript } from "@raycast/utils";

export default function Ssh() {
  const rawSshConfig = readFileSync(join(homedir(), "/.ssh/config"), "utf8");
  const parsedSshConfig = parseSSHConfig(rawSshConfig);

  return (
    <>
      <List>
        {parsedSshConfig.map((host, i) => {
          const conn = `${host.User ? `${host.User}@` : ""}${host.HostName}${host.Port ? `:${host.Port}` : ""}`;

          return (
            <List.Item
              key={i}
              title={host.name}
              id={`${host.name}`}
              icon={"host.png"}
              accessories={[
                {
                  tag: "host",
                  text: host.HostName,
                  tooltip: conn,
                },
              ]}
              subtitle={conn}
              actions={
                <ActionPanel>
                  <Action
                    title={`Connect to ${host.name}`}
                    icon={"connect.png"}
                    onAction={() => {
                      showHUD(`Connecting to ${host.name}...`);
                      runAppleScript(`tell application "Terminal" to do script "ssh ${conn}"`);
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List>
    </>
  );
}
