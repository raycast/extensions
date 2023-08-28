import { MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchDatabases } from "./utils";
import { Group } from "./interfaces";

export default function MenuCommand() {
  const [state, setState] = useState<{ isLoading: boolean; connections?: Group[] }>({ isLoading: true });

  useEffect(() => {
    (async () => {
      const data = await fetchDatabases();
      setState(data);
    })();
  }, []);

  return (
    <MenuBarExtra icon={"icon.png"} isLoading={state.isLoading}>
      {state &&
        state.connections?.map((item) => {
          return (
            <MenuBarExtra.Section key={item.id} title={item.name}>
              {item.connections.map((connection) => {
                let subtitle = connection.isOverSSH ? "SSH" : connection.isSocket ? "SOCKET" : connection.DatabaseHost;
                if (connection.database && connection.Driver !== "SQLite") {
                  subtitle += ` : ${connection.database}`;
                } else if (connection.Driver === "SQLite" && connection.isOverSSH) {
                  subtitle += ` : ${connection.DatabaseHost}`;
                }

                return (
                  <MenuBarExtra.Item
                    key={connection.id}
                    icon={connection.icon}
                    title={connection.name}
                    subtitle={subtitle}
                    onAction={() => {
                      open(`tableplus://?id=${connection.id}`);
                    }}
                  />
                );
              })}
            </MenuBarExtra.Section>
          );
        })}
    </MenuBarExtra>
  );
}
