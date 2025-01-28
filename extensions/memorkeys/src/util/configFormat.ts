import { numberToKey } from "./charLookup";

// Raw shortcut data from Raycast config
interface RaycastShortcut {
  key: string; // Unique identifier for the shortcut
  hotkey: string; // Raw hotkey string (e.g., "Command-Shift-A")
  type?: string; // Optional type information
}

// Processed shortcut data with additional information
export interface FormattedShortcut {
  name: string; // Human-readable name
  application: string; // Application name
  source: string; // Source of the shortcut
  type: string; // Type of shortcut
  key: string; // Original key identifier
  shortcut: string; // Original hotkey string
  control: boolean; // Modifier key states
  shift: boolean;
  option: boolean;
  command: boolean;
  keyCode: string; // Key code for the main key
  keyName: string; // Human-readable key name
}

// Converts camelCase text to Title Case with spaces
function formatCamelCase(str: string): string {
  if (!str) return "";
  return str
    .split(/[\s-]+/)
    .map((part) => part.split(/(?=[A-Z])/).join(" "))
    .join(" ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Main function to format Raycast shortcuts into a more usable format
export function formatShortcutData(jsonData: RaycastShortcut[]): FormattedShortcut[] {
  if (!Array.isArray(jsonData)) {
    console.error("Expected array, got:", typeof jsonData);
    console.log("Data:", JSON.stringify(jsonData, null, 2));
    return [];
  }

  console.log("Processing", jsonData.length, "items");

  // Filter out invalid items
  const validItems = jsonData.filter((item): item is RaycastShortcut => {
    if (!item) {
      console.log("Found null/undefined item");
      return false;
    }
    const hasKey = typeof item.key === "string";
    const hasHotkey = typeof item.hotkey === "string";
    if (!hasKey || !hasHotkey) {
      console.log("Invalid item:", item);
      return false;
    }
    return true;
  });

  console.log("Found", validItems.length, "valid items");

  // Process each shortcut and extract metadata
  const processedItems = validItems
    .map((item) => {
      try {
        // Split key into parts to extract metadata
        const keyParts = item.key.split("_");
        const isExtension = keyParts[0] === "extension";

        let name, application;

        // Handle extension shortcuts
        if (isExtension && keyParts.length > 1) {
          // Parse extension_extensionName.actionName format
          const [extensionName, actionName] = keyParts[1].split(".");
          name = actionName ? actionName.split("-").join(" ") : extensionName;
          application = extensionName.split("-").join(" ");

          // Special case for index entries
          if (name.toLowerCase() === "index") {
            const appWords = application.split(/[\s-]+/);
            name = appWords.slice(1).join(" ") || "Home";
            application = appWords[0];
          }
        } else {
          // Handle built-in shortcuts
          const commandName = keyParts[2] || keyParts[keyParts.length - 1];
          // Special case for window management
          if (commandName.toLowerCase().startsWith("windowmanagement")) {
            const parts = commandName.replace("windowManagement", "").split(/(?=[A-Z])/);
            name = parts.join(" ").trim();
            application = "Window Management";
          } else {
            name = commandName;
            application = commandName;
          }
        }

        // Parse hotkey string into components
        const hotkeyParts = item.hotkey.split("-");
        const lastPart = hotkeyParts[hotkeyParts.length - 1];
        const keyCodeNum = parseInt(lastPart, 10);

        // Create formatted shortcut object
        const formatted: FormattedShortcut = {
          name,
          application,
          source: keyParts[0] || "unknown",
          type: item.type || "unknown",
          key: item.key,
          shortcut: item.hotkey,
          control: hotkeyParts.includes("Control"),
          shift: hotkeyParts.includes("Shift"),
          option: hotkeyParts.includes("Option"),
          command: hotkeyParts.includes("Command"),
          keyCode: lastPart || "",
          keyName: numberToKey[keyCodeNum as keyof typeof numberToKey] || "unknown",
        };
        return formatted;
      } catch (error) {
        console.error("Error processing item:", item, error);
        return null;
      }
    })
    .filter((item): item is FormattedShortcut => item !== null);

  console.log("Processed", processedItems.length, "items successfully");

  // Apply final formatting to names
  const formattedItems = processedItems.map((item) => ({
    ...item,
    name: formatCamelCase(item.name).replace(/\b(Url|Api|Ui|Id)\b/g, (match) => match.toUpperCase()),
    application: formatCamelCase(item.application).replace(/\b(Url|Api|Ui|Id)\b/g, (match) => match.toUpperCase()),
  }));

  console.log("Final formatted items:", formattedItems.length);

  // Sort by application name, then shortcut name
  return formattedItems.sort((a, b) => {
    const appCompare = a.application.localeCompare(b.application);
    return appCompare !== 0 ? appCompare : a.name.localeCompare(b.name);
  });
}
