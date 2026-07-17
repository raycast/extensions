import { LaunchProps, showHUD, Cache } from "@raycast/api";
import Fuse from "fuse.js";
import { Device, Status, FunctionItem } from "./utils/interfaces";
import { sendCommand } from "./utils/tuyaConnector";

interface ControlDeviceArguments {
  query: string;
}

interface SwitchItem {
  device: Device;
  switch: FunctionItem;
  searchText: string;
}

export default async function Command(props: LaunchProps<{ arguments: ControlDeviceArguments }>) {
  const { query } = props.arguments;

  console.log(`Received query: "${query}"`);

  try {
    // Load cached devices
    const cache = new Cache();
    const cachedDevices = cache.get("devices");

    if (!cachedDevices) {
      await showHUD("❌ No cached devices found. Please open Tuya Smart extension first.");
      return;
    }

    const devices: Device[] = JSON.parse(cachedDevices);

    if (devices.length === 0) {
      await showHUD("❌ No devices available");
      return;
    }

    // Parse action and device name from query
    const { action, cleanedQuery } = parseQueryForAction(query);
    console.log(`Parsed action: "${action}", cleaned query: "${cleanedQuery}"`);

    // Extract all switches from all devices
    const allSwitches: SwitchItem[] = devices.flatMap((device) =>
      (device.status || [])
        .filter((status) => isSwitchableCommand(device, status))
        .map((status) => ({
          device,
          switch: status,
          searchText: `${status.name || status.code} ${device.name}`,
        }))
    );

    if (allSwitches.length === 0) {
      await showHUD("❌ No switches available");
      return;
    }

    // Configure Fuse.js for fuzzy search on switches
    const fuse = new Fuse(allSwitches, {
      keys: ["searchText", "switch.name", "switch.code", "device.name"],
      threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
      ignoreLocation: true,
      includeScore: true,
    });

    // Search for the switch using cleaned query
    const results = fuse.search(cleanedQuery);

    if (results.length === 0) {
      await showHUD(`❌ No switch found matching "${cleanedQuery}"`);
      return;
    }

    // Get the best match
    const bestMatch = results[0].item;
    const { device, switch: switchCommand } = bestMatch;

    // Use parsed action or default to toggle
    const finalAction = action;

    // Determine the command value based on action
    const command = getCommandForSwitch(device, switchCommand, finalAction);

    if (!command) {
      await showHUD(`❌ Cannot perform "${finalAction}" on ${switchCommand.name || switchCommand.code}`);
      return;
    }

    // Send the command
    const success = await sendCommand({
      device_id: device.id,
      commands: [command],
    });

    if (success) {
      const switchName = switchCommand.name || switchCommand.code;
      const actionText = finalAction === "toggle" ? "toggled" : `turned ${finalAction}`;
      await showHUD(`✅ ${switchName} (${device.name}) ${actionText}`);
    } else {
      await showHUD(`❌ Failed to control ${switchCommand.name || switchCommand.code}`);
    }
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function parseQueryForAction(query: string): { action: string; cleanedQuery: string } {
  const normalized = query.toLowerCase().trim();

  // Define action keywords to search for
  const actionKeywords = [
    // On actions
    { pattern: /\b(turn\s*on|switch\s*on|power\s*on|enable|start|activate|open)\b/i, action: "on" },
    { pattern: /\bon\b/i, action: "on" },
    // Off actions
    { pattern: /\b(turn\s*off|switch\s*off|power\s*off|disable|stop|deactivate|close|shut)\b/i, action: "off" },
    { pattern: /\boff\b/i, action: "off" },
    // Toggle actions
    { pattern: /\b(toggle|flip|switch)\b/i, action: "toggle" },
  ];

  // Try to find an action keyword in the query
  for (const { pattern, action } of actionKeywords) {
    const match = normalized.match(pattern);
    if (match) {
      // Remove the action keyword from the query to get just the device name
      const cleanedQuery = normalized.replace(pattern, "").trim();
      return { action, cleanedQuery };
    }
  }

  // No action found, default to toggle and use full query
  return { action: "toggle", cleanedQuery: normalized };
}

function fuzzyMatchAction(input: string): string {
  const normalized = input.toLowerCase().trim();

  // Define action patterns with their keywords
  const actionPatterns = [
    {
      action: "on",
      keywords: ["on", "turn on", "switch on", "enable", "start", "activate", "open", "power on"],
    },
    {
      action: "off",
      keywords: ["off", "turn off", "switch off", "disable", "stop", "deactivate", "close", "power off", "shut"],
    },
    {
      action: "toggle",
      keywords: ["toggle", "switch", "flip"],
    },
  ];

  // Create fuzzy search for actions
  const allOptions = actionPatterns.flatMap((pattern) =>
    pattern.keywords.map((keyword) => ({
      keyword,
      action: pattern.action,
    }))
  );

  const fuse = new Fuse(allOptions, {
    keys: ["keyword"],
    threshold: 0.3, // More strict for actions
    includeScore: true,
  });

  const results = fuse.search(normalized);

  // If we have a good match, use it
  if (results.length > 0 && results[0].score && results[0].score < 0.3) {
    return results[0].item.action;
  }

  // Default to toggle if unclear
  return "toggle";
}

function isSwitchableCommand(device: Device, status: FunctionItem): boolean {
  const category = device.category;

  // For switches, sockets, look for boolean types or switch commands
  if (category === "Switch" || category === "kg" || category === "Socket") {
    return status.type === "Boolean" || status.code.toLowerCase().startsWith("switch");
  }

  // For lights
  if (category === "dj" || category === "Light Source") {
    return status.code === "switch_led" || status.code.toLowerCase().startsWith("switch");
  }

  // For curtains
  if (category === "cl" || category === "Curtain") {
    return status.code === "control";
  }

  return false;
}

function getCommandForSwitch(device: Device, switchCommand: FunctionItem, action: string): Status | null {
  const category = device.category;

  // Handle Switch, Socket, and similar devices
  if (category === "Switch" || category === "kg" || category === "Socket") {
    if (switchCommand.type !== "Boolean" && !switchCommand.code.toLowerCase().startsWith("switch")) {
      return null;
    }

    let value: boolean;
    if (action === "toggle") {
      // Toggle based on current state
      value = !switchCommand.value;
    } else {
      value = action === "on" || action === "open" || action === "enable" || action === "start";
    }

    return {
      code: switchCommand.code,
      value: value,
    };
  }

  // Handle Lights
  if (category === "dj" || category === "Light Source") {
    let value: boolean;
    if (action === "toggle") {
      // Toggle based on current state
      value = !switchCommand.value;
    } else {
      value = action === "on" || action === "open" || action === "enable" || action === "start";
    }

    return {
      code: switchCommand.code,
      value: value,
    };
  }

  // Handle Curtains
  if (category === "cl" || category === "Curtain") {
    let commandValue: string;

    if (action === "toggle") {
      // For curtains, toggle doesn't make sense, default to stop
      commandValue = "stop";
    } else if (action === "on" || action === "open") {
      commandValue = "open";
    } else if (action === "off" || action === "close") {
      commandValue = "close";
    } else if (action === "stop") {
      commandValue = "stop";
    } else {
      return null;
    }

    return {
      code: "control",
      value: commandValue,
    };
  }

  return null;
}
