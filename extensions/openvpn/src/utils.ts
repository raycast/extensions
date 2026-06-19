import { exec, execSync } from "child_process";
import { runAppleScript } from "@raycast/utils";
import { promisify } from "util";

const execAsync = promisify(exec);
const openVpnBinary = '"/Applications/OpenVPN Connect/OpenVPN Connect.app/Contents/MacOS/OpenVPN Connect"';
const menuBarReadyTimeoutMs = 8000;
const menuBarPollMs = 250;

const sleep = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

const getMenuBarItems = async () =>
  runAppleScript(`
    try
      tell application "System Events" to tell process "OpenVPN Connect"
        try
          set menuBarItems to name of every menu item of menu 1 of menu bar item 1 of menu bar 2
          return menuBarItems
        end try
        try
          set menuBarItems to name of every menu item of menu 1 of menu bar item 1 of menu bar 1
          return menuBarItems
        end try
      end tell
      return ""
    on error
      return ""
    end try
`);

export const isRunning = async () => {
  try {
    const result = await runAppleScript(`
      try
        tell application "System Events"
          tell process "OpenVPN Connect"
            -- Check if the menu bar item exists (menu bar index can vary)
            if exists menu bar item 1 of menu bar 2 then
              return true
            end if
            if exists menu bar item 1 of menu bar 1 then
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

const waitForMenuBar = async () => {
  const startTime = Date.now();

  while (Date.now() - startTime < menuBarReadyTimeoutMs) {
    if (await getMenuBarItems()) return true;
    await sleep(menuBarPollMs);
  }

  return false;
};

export const startOpenVPN = async () => {
  try {
    // Start the app
    execSync(openVpnBinary);
    // Minimize it right away (running this command without the app running might fail)
    execSync(`${openVpnBinary} --minimize`);
    return await waitForMenuBar();
  } catch (e) {
    console.error(e);
    return false;
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
    const { stdout } = await execAsync(`${openVpnBinary} --list-profiles`);

    return JSON.parse(stdout);
  } catch (e) {
    return [];
  }
};

export const getStatus = async () => {
  let menuBarItems = await getMenuBarItems();
  if (!menuBarItems) {
    const isReady = await waitForMenuBar();
    if (isReady) {
      menuBarItems = await getMenuBarItems();
    }
  }

  if (!menuBarItems) {
    return {
      isConnected: false,
      selectedProfileName: "",
    };
  }

  const items = menuBarItems.split(", ").filter(Boolean);

  const isConnected = items.includes("Disconnect");

  const connectIndex = items.indexOf(isConnected ? "Disconnect" : "Connect");
  if (connectIndex <= 0) {
    return {
      isConnected,
      selectedProfileName: "",
    };
  }

  const selectedProfileIndex = connectIndex - 1;
  const selectedProfileName = items[selectedProfileIndex] ?? "";

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
      try
        tell application "System Events" to tell process "OpenVPN Connect"
          click menu item "Disconnect" of menu 1 of menu bar item 1 of menu bar 1
          return ""
        end tell
      on error
        return "Already disconnected"
      end try
    end try
  `);

  return error;
};

export const connect = async (profileName: string) => {
  const isAppRunning = await isRunning();

  if (!isAppRunning) {
    const isReady = await startOpenVPN();
    if (!isReady) {
      return "OpenVPN Connect isn't ready. Open the app and allow Accessibility permissions.";
    }
  }

  const status = await getStatus();
  if (!status.selectedProfileName) {
    return "No active profile menu found. Open OpenVPN Connect and ensure a profile is visible.";
  }

  const error = await runAppleScript(
    `
      on run argv
        set profileName to item 1 of argv
        set selectedProfileName to item 2 of argv
        try
          tell application "System Events" to tell process "OpenVPN Connect"
            click menu item profileName of menu selectedProfileName of menu item selectedProfileName of menu 1 of menu bar item 1 of menu bar 2
            return ""
          end tell
        on error
          try
            tell application "System Events" to tell process "OpenVPN Connect"
              click menu item profileName of menu selectedProfileName of menu item selectedProfileName of menu 1 of menu bar item 1 of menu bar 1
              return ""
            end tell
          on error
            return "Failed to connect"
          end try
        end try
      end run
    `,
    [profileName, status.selectedProfileName],
  );

  return error;
};
