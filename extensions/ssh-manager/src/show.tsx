import { List, ActionPanel, showHUD, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { ISSHConnection } from "./types";
import { getConnections, saveConnections } from "./storage.api";

interface Preferences {
  terminal: string;
}
const preferences = getPreferenceValues<Preferences>();
export const terminal = preferences["terminal"];

async function runTerminal(item: ISSHConnection) {
  let identity = "";
  if (item.sshKey) {
    identity = `-i ${item.sshKey} `;
  }
  const command = `ssh ${identity} ${item.user}@${item.address}`;

  const scriptTerminal = `
    tell application "Terminal"
      do script ""  
      activate
      set position of front window to {1, 1}
      set shell to do script "${command}" in window 1
    end tell
    
    tell application "System Events" to tell process "Terminal"
        set frontmost to true
        windows where title contains "bash"
        if result is not {} then perform action "AXRaise" of item 1 of result
    end tell
  `;
  const scriptIterm = `
    -- Set this property to true to open in a new window instead of a new tab
    property open_in_new_window : false
    
    on new_window()
    	tell application "iTerm" to create window with default profile
    end new_window
    
    on new_tab()
    	tell application "iTerm" to tell the first window to create tab with default profile
    end new_tab
    
    on call_forward()
    	tell application "iTerm" to activate
    end call_forward
    
    on is_running()
    	application "iTerm" is running
    end is_running
    
    on is_processing()
    	tell application "iTerm" to tell the first window to tell current session to get is processing
    end is_processing
    
    on has_windows()
    	if not is_running() then return false
    	if windows of application "iTerm" is {} then return false
    	true
    end has_windows
    
    on send_text(custom_text)
    	tell application "iTerm" to tell the first window to tell current session to write text custom_text
    end send_text
    
    -- Main
    if has_windows() then
    	-- Open the command in the current session unless it has a running command, e.g., ssh or top
    	if is_processing() then
    		if open_in_new_window then
    			new_window()
    		else
    			new_tab()
    		end if
    	end if
    else
    	-- If iTerm is not running and we tell it to create a new window, we get two
    	-- One from opening the application, and the other from the command
    	if is_running() then
    		new_window()
    	else
    		call_forward()
    	end if
    end if
    
    -- Make sure a window exists before we continue, or the write may fail
    repeat until has_windows()
    	delay 0.01
    end repeat
    
    send_text("${command}")
    call_forward()
  `;

  if (terminal == "iTerm") {
    try {
      await runAppleScript(scriptIterm);
    } catch (error) {
      await runAppleScript(scriptTerminal);
      console.log(error);
    }
  } else {
    await runAppleScript(scriptTerminal);
  }

  await showHUD("Success ✅");
}

export default function Command() {
  const [connectionsList, setConnectionsList] = useState<ISSHConnection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const items: ISSHConnection[] = await getConnections();

      setConnectionsList(items);
      setLoading(false);
    })();
  }, []);

  async function removeItem(item: ISSHConnection) {
    let items: ISSHConnection[] = await getConnections();
    items = items.filter((i) => i.id !== item.id);

    await saveConnections(items);
    setConnectionsList(items);
  }

  return (
    <List isLoading={loading}>
      {connectionsList.map((item) => {
        return (
          <List.Item
            actions={<Action item={item} onItemRemove={removeItem} />}
            id={item.id}
            key={item.name}
            title={item.name}
            subtitle={getSubtitle(item)}
          />
        );
      })}
    </List>
  );
}

function Action({
  item,
  onItemRemove,
}: {
  item: ISSHConnection;
  onItemRemove: (item: ISSHConnection) => Promise<void>;
}) {
  return (
    <>
      <ActionPanel>
        <ActionPanel.Item
          title="Connect"
          onAction={async () => {
            await runTerminal(item);
          }}
        />
        <ActionPanel.Item
          title="Remove"
          onAction={async () => {
            await onItemRemove(item);
          }}
        />
      </ActionPanel>
    </>
  );
}

function getSubtitle(item: ISSHConnection) {
  return `${item.user}@${item.address}${item.sshKey ? " SSH Key:" + item.sshKey : ""}`;
}
