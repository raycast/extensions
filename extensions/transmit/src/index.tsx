import { ActionPanel, Action, Icon, List, showToast, Toast, clearSearchBar, closeMainWindow, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { run } from "@jxa/run";
import { runAppleScript } from "run-applescript";
import "@jxa/global-type";

export interface ConnectionEntry {
  id: number;
  identifier: string;
  name: string;
  address: string;
  port: number;
  protocol: string;
  username: number;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [servers, setServers] = useState<ConnectionEntry[]>([]);

  async function init() {
    getServers()
      .then((servers) => {
        setServers(servers);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    init();
  }, []);

  if (error) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Failed to load servers",
      message: "Download from https://panic.com/transmit/",
      primaryAction: {
        title: "Download Transmit",
        onAction: (toast) => {
          open("https://panic.com/transmit/");
          toast.hide();
        },
      },
    };

    showToast(options);
  }

  return (
    <List searchBarPlaceholder="Search servers..." isLoading={isLoading}>
      {servers?.map((item) => (
        <ListItem key={item.identifier} entry={item} />
      ))}
    </List>
  );
}

function ListItem(props: { entry: ConnectionEntry }) {
  return (
    <List.Item
      title={props.entry.name}
      subtitle={props.entry.address}
      accessoryTitle={props.entry.protocol}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Connect in Transmit"
              icon={Icon.Globe}
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Connecting...",
                });

                clearSearchBar();
                closeMainWindow();

                runAppleScript(`
                                tell application "Transmit"
                                    activate
                                    set allBookmarks to get favorites
                                    if exists document 1 then
                                        tell current tab of document 1
                                            close remote browser
		                                    connect to item ${props.entry.id} of allBookmarks
                                        end tell
                                    else
                                        tell current tab of (make new document at end)
		                                    connect to item ${props.entry.id} of allBookmarks
                                        end tell
                                    end if
                                    activate
                                end tell
                                `);
              }}
            />
            <Action
              title="Connect in Transmit (+Tab)"
              icon={Icon.Plus}
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Connecting...",
                });

                clearSearchBar();
                closeMainWindow();

                runAppleScript(`
                                tell application "Transmit"
                                    activate
                                    set allBookmarks to get favorites
                                    if exists document 1 then
                                        set current tab of document 1 to (make new tab at end of document 1)
			                            tell current tab of document 1
                                            close remote browser
		                                    connect to item ${props.entry.id} of allBookmarks
                                        end tell
                                    else
                                        tell current tab of (make new document at end)
		                                    connect to item ${props.entry.id} of allBookmarks
                                        end tell
                                    end if
                                    activate
                                end tell
                                `);
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export async function getServers(): Promise<ConnectionEntry[]> {
  return run(() => {
    const Transmit = Application("Transmit");

    return Transmit.favorites().map(
      (
        item: {
          identifier: { get: () => any };
          name: { get: () => any };
          address: { get: () => any };
          port: { get: () => any };
          protocol: { get: () => any };
        },
        index: number
      ) => {
        return {
          id: index + 1,
          identifier: item.identifier.get(),
          name: item.name.get(),
          address: item.address.get(),
          port: item.port.get(),
          protocol: item.protocol.get(),
        };
      }
    );
  });
}
