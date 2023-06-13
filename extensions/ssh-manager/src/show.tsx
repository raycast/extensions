import { List, ActionPanel, showHUD, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { ISSHConnection } from "./types";
import { getConnections, saveConnections } from "./storage.api";

interface Preferences {
  terminal: string;
  openin: string;
}
const preferences = getPreferenceValues<Preferences>();
export const terminal = preferences["terminal"];
export const openIn = preferences["openin"];

async function runTerminal(item: ISSHConnection) {
  let identity = "";
  if (item.sshKey) {
    identity = `-i ${item.sshKey} `;
  }
  let customport = "";
  if (item.port) {
    customport = `-p ${item.port} `;
  }
  const command = `ssh ${identity} ${item.user}@${item.address} ${customport}`;

  const scriptWarp = `
      -- For the latest version:
      -- https://github.com/DavidMChan/custom-alfred-warp-scripts
      
      -- Set this property to true to always open in a new window
      property open_in_new_window : ${openIn == "newWindow"}
      
      -- Set this property to true to always open in a new tab
      property open_in_new_tab : ${openIn == "newTab"}
      
      -- Don't change this :)
      property opened_new_window : false
      
      -- Handlers
      on new_window()
          tell application "System Events" to tell process "Warp"
              click menu item "New Window" of menu "File" of menu bar 1
              set frontmost to true
          end tell
          delay 0.5
      end new_window
      
      on new_tab()
          tell application "System Events" to tell process "Warp"
              click menu item "New Tab" of menu "File" of menu bar 1
              set frontmost to true
          end tell
      end new_tab
      
      on call_forward()
          tell application "Warp" to activate
      end call_forward
      
      on is_running()
          application "Warp" is running
      end is_running
      
      on has_windows()
          if not is_running() then return false
          tell application "System Events"
              if windows of process "Warp" is {} then return false
          end tell
          true
      end has_windows
      
      on send_text(custom_text)
          tell application "System Events"
              keystroke custom_text
          end tell
      end send_text
      
      
      -- Main
      if not is_running() then
          call_forward()
          set opened_new_window to true
      else
          call_forward()
          set opened_new_window to false
      end if
  
      if has_windows() then
          if open_in_new_window and not opened_new_window then
              new_window()
          else if open_in_new_tab and not opened_new_window then
              new_tab()
          end if
      else
          new_window()
      end if
  
  
      -- Make sure a window exists before we continue, or the write may fail
      repeat until has_windows()
          delay 0.5
      end repeat
      delay 0.5
  
      send_text("${command}")
      call_forward()
  `;
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
    property open_in_new_window : ${openIn == "newWindow"}
    
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
      if open_in_new_window then
        new_window()
      else
        new_tab()
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
  } else if (terminal == "Warp") {
    try {
      await runAppleScript(scriptWarp);
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
  return `${item.user}@${item.address}${item.port ? " Port:" + item.port : ""}${
    item.sshKey ? " SSH Key:" + item.sshKey : ""
  }`;
}
