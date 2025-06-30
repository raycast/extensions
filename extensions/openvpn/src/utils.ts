import { exec, execSync } from "child_process";
import { runAppleScript } from "run-applescript";
import { promisify } from "util";

const execAsync = promisify(exec);

export const isRunning = async () => {
  try {
    const result = await runAppleScript(`
      try
        tell application "System Events"
          tell process "OpenVPN Connect"
            -- Check if the menu bar item 1 of menu bar 2 exists
            if exists menu bar item 1 of menu bar 2 then
              return true
            else
              return false
            end if
          end tell
        end tell
      on error
        return false
      end try
    `);

    return result === "true";
  } catch (e) {
    return false;
  }
};

export const startOpenVPN = async () => {
  try {
    // Start the app
    execSync('"/Applications/OpenVPN Connect/OpenVPN Connect.app/contents/MacOS/OpenVPN Connect"');
    // Minimize it right away (running this command without the app running might fail)
    execSync('"/Applications/OpenVPN Connect/OpenVPN Connect.app/contents/MacOS/OpenVPN Connect" --minimize');
  } catch (e) {
    console.error(e);
  }
};

export const listProfiles = async (): Promise<
  {
    host: string;
    id: string;
    name: string;
    type: string;
    username: string;
    "server-override": string;
  }[]
> => {
  try {
    const { stdout } = await execAsync(
      '"/Applications/OpenVPN Connect/OpenVPN Connect.app/contents/MacOS/OpenVPN Connect" --list-profiles',
    );

    return JSON.parse(stdout);
  } catch (e) {
    return [];
  }
};

export const getStatus = async () => {
  const menuBarItems = await runAppleScript(`
    tell application "System Events" to tell process "OpenVPN Connect"
      set menuBarItems to name of every menu item of menu 1 of menu bar item 1 of menu bar 2
      return menuBarItems
    end tell
`);

  const items = menuBarItems.split(", ");

  const isConnected = items.includes("Disconnect");

  const selectedProfileIndex = items.indexOf(isConnected ? "Disconnect" : "Connect") - 1;
  const selectedProfileName = items[selectedProfileIndex];

  return {
    isConnected,
    selectedProfileName,
  };
};

export const disconnect = async () => {
  const isAppRunning = await isRunning();

  if (!isAppRunning) return;

  const error = await runAppleScript(`
    try
      tell application "System Events" to tell process "OpenVPN Connect"
        click menu item "Disconnect" of menu 1 of menu bar item 1 of menu bar 2
        return ""
      end tell
    on error
		  return "Already disconnected"
	  end try
  `);

  return error;
};

export const connect = async (profileName: string) => {
  const isAppRunning = await isRunning();

  if (!isAppRunning) {
    startOpenVPN();
  }

  const status = await getStatus();

  const error = await runAppleScript(`
    try
      tell application "System Events" to tell process "OpenVPN Connect"
        click menu item "${profileName}" of menu "${status.selectedProfileName}" of menu item "${status.selectedProfileName}" of menu 1 of menu bar item 1 of menu bar 2
        return ""
      end tell
    on error
		  return "Failed to connect"
	  end try
  `);

  return error;
};
