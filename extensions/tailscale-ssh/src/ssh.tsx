import { ActionPanel, List, Action, Icon, Image, getApplications, closeMainWindow, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { Device, getStatus, getDevices, getErrorDetails, ErrorDetails } from "./shared";

import { runAppleScript } from "run-applescript";
export default function DeviceList() {
  const [devices, setDevices] = useState<Device[]>();
  const [error, setError] = useState<ErrorDetails>();
  useEffect(() => {
    async function fetch() {
      try {
        const status = getStatus();
        const _list = getDevices(status);
        setDevices(_list);

        const installedApplications = await getApplications();
        console.log("The following applications are installed on your Mac:");
        console.log(installedApplications.map((a) => a.name).join(", "));
      } catch (error) {
        setError(getErrorDetails(error, "Couldn’t load device list."));
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={!devices && !error}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={error.title} description={error.description} />
      ) : (
          devices?.sort((x, y) => {
            if (x.online && !y.online) {
              return -1;
            }
            if (!x.online && y.online) {
              return 1;
            }
            return x.name.localeCompare(y.name);
          }).map((device) => (
          <List.Item
            title={device.name}
            subtitle={device.ipv4 + "   " + device.os}
            key={device.key}
            icon={
              device.online
                ? {
                    source: {
                      light: "connected_light.png",
                      dark: "connected_dark.png",
                    },
                    mask: Image.Mask.Circle,
                  }
                : {
                    source: {
                      light: "lastseen_light.png",
                      dark: "lastseen_dark.png",
                    },
                    mask: Image.Mask.Circle,
                  }
            }
            accessories={
              device.self
                ? [
                    { text: "This device", icon: Icon.Person },
                    {
                      text: device.online ? `        Connected` : "Last seen " + formatDate(device.lastseen),
                    },
                  ]
                : [
                    {
                      text: device.online ? `        Connected` : "Last seen " + formatDate(device.lastseen),
                    },
                  ]
            }
            actions={
              <ActionPanel>
                <Action
                  title="Start SSH Connection Using Root"
                  onAction={() => {
                    closeMainWindow();
                    popToRoot();
                    runInIterm("ssh root@" + device.ipv4);
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
const runInIterm = (command: string) => {
  const script = `
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

    set new_window_created to false
    
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
      set new_window_created to true
    end if

    if is_running() and not new_window_created then
      new_tab()
    else
      -- Make sure a window exists before we continue, or the write may fail
      repeat until has_windows()
        delay 0.01
      end repeat
    end

    send_text("${command.replaceAll('"', '\\"')}")
    call_forward()
  `;

  runAppleScript(script);
};
function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
