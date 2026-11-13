import type { Icon } from "@raycast/api";

export type ActionIconName = keyof typeof Icon;

interface ActionIconDescriptor {
  category: string;
  id: number;
  name: string;
}

// These overrides restore the hand-picked icons from the original static action list.
// BTT's predefined action IDs are stable, so they also apply to definitions loaded
// dynamically from the catalog. Add or change individual mappings here.
export const ACTION_ICON_OVERRIDES: Readonly<Record<number, ActionIconName>> = {
  1: "Mouse", // Middle Click
  2: "Mouse", // CMD Click
  3: "Mouse", // Left Click
  4: "Mouse", // Right Click
  5: "AppWindowGrid2x2", // Expose
  6: "AppWindowGrid2x2", // App Expose
  7: "Monitor", // Spaces
  8: "AppWindowList", // Dashboard
  9: "Lock", // Login Screen
  10: "Finder", // Finder
  11: "Plus", // Zoom In
  12: "Minus", // Zoom Out
  13: "Moon", // Sleep Display
  14: "Moon", // Sleep Computer
  15: "Logout", // Logout
  16: "EyeDisabled", // Hidden Files
  22: "MicrophoneDisabled", // Mute
  23: "Play", // Play
  24: "SpeakerUp", // Volume Up
  25: "SpeakerDown", // Volume Down
  26: "RewindFilled", // Backwards
  27: "ForwardFilled", // Forward
  28: "Sun", // Brightness Up
  29: "Sun", // Brightness Down
  30: "Eject", // Eject
  33: "Keyboard", // F1
  34: "Keyboard", // F2
  35: "Keyboard", // F3
  36: "Keyboard", // F4
  37: "Keyboard", // F5
  38: "Keyboard", // F6
  39: "Keyboard", // F7
  40: "Keyboard", // F8
  41: "Keyboard", // F9
  42: "Keyboard", // F10
  43: "Keyboard", // F11
  44: "Keyboard", // F12
  45: "Desktop", // Desktop
  46: "AppWindowGrid2x2", // App Switcher
  47: "Monitor", // Next Monitor
  48: "Monitor", // Max Next Monitor
  50: "EyeDisabled", // Hide All Windows
  51: "ArrowRightCircleFilled", // Page Forward
  52: "ArrowLeftCircleFilled", // Page Backward
  54: "Mouse", // Double Click
  55: "Redo", // Restart BTT
  57: "Gear", // Open BTT Preferences
  59: "Link", // Open URL
  60: "ArrowUpCircleFilled", // Page Up
  61: "ArrowDownCircleFilled", // Page Down
  62: "House", // Home
  63: "Keyboard", // End
  65: "Mouse", // Start Drag
  66: "Mouse", // Stop Drag
  68: "Mouse", // Toggle Magic Mouse Touchpad Mode
  87: "Mouse", // Ctrl Click
  88: "Mouse", // Alt Click
  89: "Mouse", // Shift Click
  111: "Mouse", // CMD Shift Click
  112: "Maximize", // Full Screen
  113: "ArrowLeftCircleFilled", // Switch Space Left
  114: "ArrowRightCircleFilled", // Switch Space Right
  115: "AppWindowGrid2x2", // Launchpad
  118: "Clipboard", // Paste String
  120: "Sun", // Brightness Up On External
  121: "Sun", // Brightness Down On External
  151: "AppWindowSidebarLeft", // Move Window To Left Space
  152: "AppWindowSidebarRight", // Move Window To Right Space
  153: "Mouse", // Change Mouse Position
  154: "Mouse", // Save Current Mouse Position
  155: "Mouse", // Restore Saved Mouse Position
  156: "Trash", // Empty Trash
  157: "Finder", // Open Finder Selection With App
  158: "Lock", // Lock Screen
  159: "LockUnlocked", // Unlock Screen
  160: "Mouse", // Start Recording Mouse Gesture
  161: "Mouse", // Stop Recording Mouse Gesture
  162: "Ellipsis", // Trigger Context Menu Item
  169: "Monitor", // Screenshot
  170: "Window", // Screenshot Window
  171: "Image", // Screenshot And Edit
  172: "CodeBlock", // Run Apple Script String
  173: "Microphone", // Start Siri
  178: "Keyboard", // Mod Shift Down
  179: "Keyboard", // Mod Shift Up
  180: "Keyboard", // Mod FN Down
  181: "Keyboard", // Mod FN Up
  182: "Keyboard", // Mod Ctrl Down
  183: "Keyboard", // Mod Ctrl Up
  184: "Keyboard", // Mod Opt Down
  185: "Keyboard", // Mod Opt Up
  186: "Keyboard", // Mod CMD Down
  187: "Keyboard", // Mod CMD Up
  188: "Keyboard", // Toggle TouchBar
  189: "Keyboard", // ESC
  194: "Keyboard", // Toggle Caps Lock
  195: "CodeBlock", // Run Apple Script In Background String
  196: "Monitor", // Add New Space
  197: "Contrast", // Toggle Dark Mode
  198: "SpeakerUp", // Volume Up Little
  199: "SpeakerDown", // Volume Down Little
  201: "Moon", // Toggle Night Shift
  203: "Clipboard", // Show Clipboard Manager
  204: "Window", // Bring Window Under Cursor To Front
  206: "Terminal", // Shell Task
  207: "Monitor", // Switch To Desktop 1
  208: "Monitor", // Switch To Desktop 2
  209: "Monitor", // Switch To Desktop 3
  210: "Monitor", // Switch To Desktop 4
  211: "Monitor", // Switch To Desktop 5
  212: "Monitor", // Switch To Desktop 6
  213: "Monitor", // Switch To Desktop 7
  214: "Monitor", // Switch To Desktop 8
  215: "Monitor", // Switch To Desktop 9
  216: "Monitor", // Move Window To Desktop 1
  217: "Monitor", // Move Window To Desktop 2
  218: "Monitor", // Move Window To Desktop 3
  219: "Monitor", // Move Window To Desktop 4
  220: "Monitor", // Move Window To Desktop 5
  222: "Monitor", // Move Window To Desktop 6
  223: "Monitor", // Move Window To Desktop 7
  224: "Monitor", // Move Window To Desktop 8
  225: "Monitor", // Move Window To Desktop 9
  226: "Monitor", // Switch To Desktop 10
  227: "Monitor", // Switch To Desktop 11
  228: "Monitor", // Switch To Desktop 12
  229: "Monitor", // Switch To Desktop 13
  230: "Monitor", // Switch To Desktop 14
  231: "Monitor", // Switch To Desktop 15
  232: "Monitor", // Switch To Desktop 16
  233: "Monitor", // Switch To Desktop 17
  234: "Monitor", // Switch To Desktop 18
  235: "Monitor", // Switch To Desktop 19
  236: "Monitor", // Move Window To Desktop 10
  237: "Monitor", // Move Window To Desktop 11
  238: "Monitor", // Move Window To Desktop 12
  239: "Monitor", // Move Window To Desktop 13
  240: "Monitor", // Move Window To Desktop 14
  241: "Monitor", // Move Window To Desktop 15
  242: "Monitor", // Move Window To Desktop 16
  243: "Monitor", // Move Window To Desktop 17
  244: "Monitor", // Move Window To Desktop 18
  245: "Monitor", // Move Window To Desktop 19
  246: "Terminal", // Terminal Command Blocking
  247: "XMarkCircleFilled", // Quit App Under Cursor
  250: "Clipboard", // Custom Paste
  252: "CodeBlock", // Run JavaScript In Background String
  253: "CodeBlock", // Run JavaScript On Main Thread String
  259: "Sun", // Brightness Up Little
  260: "Sun", // Brightness Down Little
  261: "Sun", // Brightness External Up Little
  262: "Sun", // Brightness External Down Little
  264: "Keyboard", // Keyboard Shortcut
  265: "EyeDisabled", // Hide Menubar Extras
  272: "Mouse", // Scroll
  274: "Bluetooth", // Connect Bluetooth Device
  275: "Bluetooth", // Disconnect Bluetooth Device
  276: "Bluetooth", // Toggle Bluetooth Device
  277: "Bluetooth", // Enable Bluetooth
  278: "Bluetooth", // Disable Bluetooth
  279: "Bluetooth", // Toggle Bluetooth
  281: "CodeBlock", // Run Core JavaScript
};

// Ordered from specific to general. New catalog actions can receive a useful icon
// from their name without needing an explicit ID override.
export const ACTION_NAME_ICON_RULES: ReadonlyArray<{ pattern: RegExp; icon: ActionIconName }> = [
  { pattern: /\b(screen ?shot|screen capture|capture screen)\b/i, icon: "Camera" },
  { pattern: /\b(apple ?script|java ?script|core java ?script)\b/i, icon: "CodeBlock" },
  { pattern: /\b(shell|terminal|command line)\b/i, icon: "Terminal" },
  { pattern: /\b(clipboard|copy|paste)\b/i, icon: "Clipboard" },
  { pattern: /\b(bluetooth)\b/i, icon: "Bluetooth" },
  { pattern: /\b(midi|device)\b/i, icon: "Devices" },
  { pattern: /\b(brightness|true tone)\b/i, icon: "Sun" },
  { pattern: /\b(sleep|night shift)\b/i, icon: "Moon" },
  { pattern: /\b(volume up|louder)\b/i, icon: "SpeakerUp" },
  { pattern: /\b(volume down|quieter)\b/i, icon: "SpeakerDown" },
  { pattern: /\b(mute|unmute)\b/i, icon: "SpeakerOff" },
  { pattern: /\b(previous track|rewind)\b/i, icon: "RewindFilled" },
  { pattern: /\b(next track|fast forward)\b/i, icon: "ForwardFilled" },
  { pattern: /\b(play|pause|media)\b/i, icon: "Play" },
  { pattern: /\b(microphone|siri|dictation)\b/i, icon: "Microphone" },
  { pattern: /\b(mouse|click|cursor|scroll|drag)\b/i, icon: "Mouse" },
  { pattern: /\b(keyboard|shortcut|keystroke|function key)\b/i, icon: "Keyboard" },
  { pattern: /\b(type|typing|text)\b/i, icon: "TextInput" },
  { pattern: /\b(variable)\b/i, icon: "TextCursor" },
  { pattern: /\b(finder)\b/i, icon: "Finder" },
  { pattern: /\b(lock screen|login screen|unlock screen)\b/i, icon: "Lock" },
  { pattern: /\b(url|link|website|web view)\b/i, icon: "Link" },
  { pattern: /\b(notification|hud|alert)\b/i, icon: "Bell" },
  { pattern: /\b(preferences|settings)\b/i, icon: "Gear" },
  { pattern: /\b(floating menu|context menu|menu item|menubar)\b/i, icon: "AppWindowList" },
  { pattern: /\b(mission control|space|desktop|monitor|display)\b/i, icon: "Monitor" },
  { pattern: /\b(window)\b/i, icon: "Window" },
  { pattern: /\b(launch app|open app|application)\b/i, icon: "AppWindowGrid2x2" },
  { pattern: /\b(restart|reload|refresh)\b/i, icon: "ArrowClockwise" },
  { pattern: /\b(quit|close|terminate)\b/i, icon: "XMarkCircleFilled" },
  { pattern: /\b(hide|show)\b/i, icon: "Eye" },
  { pattern: /\b(zoom|maximize|fullscreen)\b/i, icon: "Maximize" },
  { pattern: /\b(file|folder)\b/i, icon: "Folder" },
  { pattern: /\b(download|import)\b/i, icon: "Download" },
  { pattern: /\b(upload|export)\b/i, icon: "Upload" },
  { pattern: /\b(delay|wait|timer)\b/i, icon: "Stopwatch" },
];

// Names that do not match a rule automatically receive a category icon until a
// more specific override or rule is added above.
export const ACTION_CATEGORY_ICONS: Readonly<Record<string, ActionIconName>> = {
  "Additional Missing Actions": "CommandSymbol",
  "Application Control": "AppWindowGrid2x2",
  "BetterTouchTool Control": "Gear",
  "Clipboard Actions": "Clipboard",
  "Control Flow Actions": "Repeat",
  "Custom Actions": "Bolt",
  "Device Control": "Devices",
  "Display & Brightness": "Sun",
  "Floating Menu Actions": "AppWindowList",
  "Keyboard Actions": "Keyboard",
  "Media Controls": "Play",
  "Mouse & Trackpad Actions": "Mouse",
  "Notch Bar Actions": "Monitor",
  "Screenshot Actions": "Camera",
  "Script Execution": "CodeBlock",
  "Spaces & Mission Control": "AppWindowGrid2x2",
  "Stream Deck Actions": "Devices",
  "System Actions": "Desktop",
  "Text & Typing Actions": "Text",
  "Touch Bar Actions": "Keyboard",
  "UI Automation Actions": "AppWindow",
  "Variable Actions": "TextCursor",
  "Window Management Actions": "Window",
};

export function getActionCategoryIconName(category: string): ActionIconName {
  return ACTION_CATEGORY_ICONS[category] ?? "CommandSymbol";
}

export function getActionIconName(action: ActionIconDescriptor): ActionIconName {
  const inferredIcon = ACTION_NAME_ICON_RULES.find(({ pattern }) => pattern.test(action.name))?.icon;
  return ACTION_ICON_OVERRIDES[action.id] ?? inferredIcon ?? getActionCategoryIconName(action.category);
}
