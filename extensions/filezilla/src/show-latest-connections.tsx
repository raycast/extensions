import { useState, useEffect } from "react";
import { Action, ActionPanel, List, open, showToast, Toast } from "@raycast/api";
import { connectToTheServer, getServers, isFileZillaInstalled } from "./utils";
import { Server } from "./types";

const { Item, EmptyView } = List;

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);

  useEffect(() => {
    async function init() {
      const is_filezilla_installed = await isFileZillaInstalled();
      if (!is_filezilla_installed) {
        setIsError(true);
        showToast({
          title: "FileZilla is not installed",
          message: "Install it from the official website",
          style: Toast.Style.Failure,
          primaryAction: {
            title: "Go to FileZilla website",
            onAction: async () => await open("https://filezilla-project.org/"),
          },
        });
        setIsLoading(false);
        return;
      }

      const savedServers = await getServers("recentservers");
      setServers(savedServers);
      setIsLoading(false);
    }

    init();
  }, []);

  return (
    <List isLoading={isLoading}>
      {servers.length ? (
        <>
          {servers.map((server, i) => (
            <Item
              title={"Host: " + server.Host}
              subtitle={"User: " + server.User}
              key={i}
              actions={
                <ActionPanel>
                  <Action title="Connect" onAction={() => connectToTheServer(server)} />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        !isError && <EmptyView title="No connections found" />
      )}
    </List>
  );
}
