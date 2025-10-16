import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showHUD,
} from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";
import { getConnections, saveConnections } from "./storage.api";
import { ISSHConnection } from "./types";

const preferences = getPreferenceValues<Preferences>();
export const terminal = preferences["terminal"];
export const openIn = preferences["openin"];
export const onlyName = preferences["onlyname"];

async function runTerminal(item: ISSHConnection) {
  let command;
  if (onlyName) {
    const name = item.name;
    command = ["ssh", name].join(" ");
  } else {
    let identity = "";
    if (item.sshKey) {
      identity = `-i ${item.sshKey} `;
    }
    let customPort = "";
    if (item.port) {
      customPort = `-p ${item.port} `;
    }
    let customCommand = "";
    let interactive = "";
    if (item.command) {
      customCommand = `\\"${item.command}\\" `;
      interactive = "-t";
    }
    let address = item.address;
    if (item.user) {
      address = `${encodeURIComponent(item.user)}@${address}`;
    }
    command = ["ssh", interactive, identity, address, customPort, customCommand].filter(Boolean).join(" ");
  }

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

  const scriptAlacritty = `
  -- Set this property to true to always open in a new window
  property open_in_new_window : ${openIn == "newWindow"}

  -- Set this property to true to always open in a new tab
  property open_in_new_tab : ${openIn == "newTab"}

  -- Don't change this :)
  property opened_new_window : false

  -- Handlers
  on new_window()
      tell application "Alacritty"
          activate
          delay 0.5
          tell application "System Events" to tell process "Alacritty"
              keystroke "n" using {command down}
          end tell
      end tell
      delay 0.5
  end new_window

  on new_tab()
      tell application "Alacritty"
          activate
          tell application "System Events" to tell process "Alacritty"
              keystroke "t" using {command down}
          end tell
      end tell
      delay 0.5
  end new_tab

  on call_forward()
      tell application "Alacritty" to activate
      tell application "Alacritty" to reopen
  end call_forward

  on is_running()
      application "Alacritty" is running
  end is_running

  on has_windows()
      if not is_running() then return false
      tell application "System Events"
          if windows of process "Alacritty" is {} then return false
      end tell
      true
  end has_windows

  on send_text(custom_text)
      tell application "System Events" to tell process "Alacritty"
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

  if not has_windows() then
    tell application "Alacritty" to reopen
    delay 0.2
    tell application "Alacritty" to activate
  end if

  if open_in_new_window and not opened_new_window then
      new_window()
  else if open_in_new_tab and not opened_new_window then
      new_tab()
  end if


  -- Make sure a window exists before we continue, or the write may fail
  repeat until has_windows()
      delay 0.5
  end repeat
  delay 0.5
  send_text("${command}
") -- Enter at the end of string
  call_forward()
  `;

  const scriptHyper = `
  -- Set this property to true to open in a new window instead of a new tab
  property open_in_new_window : ${openIn == "newWindow"}

  on new_window()
      tell application "System Events" 
          launch application "Hyper"
      end tell
  end new_window

  on new_tab()
      tell application "System Events"
          -- Check if Hyper is already running
          set isRunning to (exists process "Hyper")

          if isRunning then
              -- If Hyper is running, bring it to the front and open a new tab
              tell application "Hyper" to activate
              tell application "System Events" to keystroke "t" using command down
          else
              -- If Hyper isn't running, launch it
              launch application "Hyper"
          end if
      end tell
  end new_tab

  on call_forward()
      tell application "Hyper" to activate
  end call_forward

  on is_running()
      application "Hyper" is running
  end is_running

  -- Hyper doesn't have a direct equivalent to 'is processing', so we'll assume it's ready if it's running
  on is_processing()
      is_running()
  end is_processing

  on has_windows()
      if not is_running() then return false
      -- Hyper always has at least one window, so we'll just check if it's running
      true
  end has_windows

  on send_text(custom_text)
      tell application "System Events"
          keystroke custom_text & return
      end tell
  end send_text

  -- Main
  if has_windows() then
      if open_in_new_window then
          new_window()
      else
          new_tab()
      end if
  else
      -- If Hyper is not running and we tell it to create a new window, we get two
      -- One from opening the application, and the other from the command
      if is_running() then
          new_window()
      else
          call_forward()
      end if
  end if 


  -- Give Hyper some time to load 
  repeat until has_windows()
      delay 0.5
  end repeat
  delay 0.5

  send_text("${command}")
  call_forward()
  `;

  const scriptGhostty = `
  -- Set this property to true to open in a new window instead of a new tab
  property open_in_new_window : ${openIn == "newWindow"}

  on new_window()
      tell application "Ghostty"
          activate
          tell application "System Events" to tell process "Ghostty"
              keystroke "n" using {command down}
          end tell
      end tell
      delay 0.5
  end new_window

  on new_tab()
      tell application "Ghostty"
          activate
          tell application "System Events" to tell process "Ghostty"
              keystroke "t" using {command down}
          end tell
      end tell
      delay 0.5
  end new_tab

  on call_forward()
      tell application "Ghostty" to activate
  end call_forward

  on is_running()
      application "Ghostty" is running
  end is_running

  on has_windows()
      if not is_running() then return false
      tell application "System Events"
          if windows of process "Ghostty" is {} then return false
      end tell
      true
  end has_windows

  on send_text(custom_text)
      tell application "System Events" to tell process "Ghostty"
          keystroke custom_text & return
      end tell
  end send_text

  -- Main
  if has_windows() then
      if open_in_new_window then
          new_window()
      else
          new_tab()
      end if
  else
      if is_running() then
          new_window()
      else
          call_forward()
      end if
  end if

  -- Give Ghostty some time to load
  repeat until has_windows()
      delay 0.5
  end repeat
  delay 0.5

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
  } else if (terminal == "Alacritty") {
    try {
      await closeMainWindow(); // neccessary when alacritty already in fullscreen
      await runAppleScript(scriptAlacritty);
    } catch (error) {
      await runAppleScript(scriptTerminal);
      console.log(error);
    }
  } else if (terminal == "Hyper") {
    try {
      await runAppleScript(scriptHyper);
    } catch (error) {
      await runAppleScript(scriptTerminal);
      console.log(error);
    }
  } else if (terminal == "Ghostty") {
    try {
      await runAppleScript(scriptGhostty);
    } catch (error) {
      await runAppleScript(scriptTerminal);
      console.log(error);
    }
  } else {
    await runAppleScript(scriptTerminal);
  }

  await showHUD(`✅ Connection [${item.name}] opened with [${terminal}].`);
}

function getConnectionString(item: ISSHConnection) {
  if (onlyName) {
    return item.name;
  }

  const parts = [];
  if (item.sshKey) parts.push(`-i ${item.sshKey}`);
  if (item.port) parts.push(`-p ${item.port}`);
  if (item.command) parts.push(`"${item.command}"`);

  const address = item.user ? `${item.user}@${item.address}` : item.address;
  parts.unshift("ssh", address);

  return parts.filter(Boolean).join(" ");
}

export default function Command() {
  const { isLoading: loading, data: connectionsList = [], revalidate } = usePromise(getConnections);

  async function removeItem(item: ISSHConnection) {
    const confirmed = await confirmAlert({
      title: "Remove Connection",
      message: `Are you sure you want to remove connection [${item.name}]?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });
    if (confirmed) {
      let items: ISSHConnection[] = await getConnections();
      items = items.filter((i) => i.id !== item.id);

      await saveConnections(items);
      revalidate();
      await showHUD(`🗑 Connection [${item.name}] removed!`);
    }
  }

  return (
    <List isLoading={loading}>
      {connectionsList.map((item) => {
        return (
          <List.Item
            actions={<GetAction item={item} onItemRemove={removeItem} />}
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

function GetAction({
  item,
  onItemRemove,
}: {
  item: ISSHConnection;
  onItemRemove: (item: ISSHConnection) => Promise<void>;
}) {
  const itemString = getConnectionString(item);
  return (
    <ActionPanel>
      <ActionPanel.Section title="Operations">
        <Action icon={Icon.Terminal} title="Open Connection" onAction={() => runTerminal(item)} />
        <Action.CopyToClipboard
          title="Copy Connection String"
          content={itemString}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.Paste
          icon={Icon.Text}
          title="Paste Connection String"
          content={itemString}
          shortcut={{ modifiers: ["cmd"], key: "v" }}
          onPaste={() => showHUD(`📝 Pasting conn. [${item.name}] to active app`)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger zone">
        <Action
          title="Remove Connection"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => onItemRemove(item)}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getSubtitle(item: ISSHConnection) {
  return `${item.user ? item.user + "@" : ""}${item.address}${item.port ? " Port: " + item.port : ""}${
    item.sshKey ? " SSH Key: " + item.sshKey : ""
  } ${item.command ? ' Command: "' + item.command + '"' : ""}`;
}
