import { ActionPanel, Action, Icon, List, showToast, Toast, clearSearchBar, closeMainWindow, open, getApplications } from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";

export interface ConnectionEntry {
  id: string;
  identifier: string;
  name: string;
  address: string;
  port: string;
  protocol: string;
  username: string;
}

export default function Command() {
  const { isLoading, data: servers } = usePromise(
    async () => {
      const apps = await getApplications();
      const transmit = apps.find(app => app.name==="Transmit");
      if (!transmit) throw new Error();
      return await getServers();
    }, [], {
      failureToastOptions: {
        title: "Failed to load servers",
        message: "Download from https://panic.com/transmit/",
        primaryAction: {
          title: "Download Transmit",
          onAction: (toast) => {
            open("https://panic.com/transmit/");
            toast.hide();
          },
        },
      }
    }
  )

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
      accessories={[{text: props.entry.protocol}]}
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
              title="Connect in Transmit (+tab)"
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

async function getServers(): Promise<ConnectionEntry[]> {
  const res = await runAppleScript(`
    set _output to ""
    tell application "Transmit"
      set _id to 1
      repeat with f in favorites
        set _identifier to get identifier of f
        set _name to get name of f
        set _address to get address of f
        set _port to get port of f
        set _protocol to get protocol of f
        
        set _output to (_output & _identifier & "," & _name & "," & _address & "," & _port & "," & _protocol & "," & _id & "\n")
        
        set _id to _id + 1
      end repeat
    end tell
    return _output
    `
  );
  const servers = res.split("\n").slice(0,-1).map(server => {
    const [identifier, name="", address, port, protocol, username, id] = server.split(",");
    return {
      identifier, name, address, port, protocol, username, id
    }
  });
  return servers;
}
