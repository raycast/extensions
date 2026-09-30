const ErrorMessages = {
  Generic: "An error occurred",
  NoConnections: "No connections found",
  Permissions: "Please allow Raycast to control Viscosity in System Settings",
} as const

export const Error = {
  ...ErrorMessages,
  HUD: {
    Generic: `❌ ${ErrorMessages.Generic}`,
    NoConnections: `⚠️ ${ErrorMessages.NoConnections}`,
    Permissions: `🔒 ${ErrorMessages.Permissions}`,
  },
} as const

const MessageText = {
  Connecting: "Connecting",
  Disconnecting: "Disconnecting",
  Connected: "Connected",
  Disconnected: "Disconnected",
  NoActiveConnections: "There are no active connections",
  AlreadyActive: "is already active",
} as const

export const Message = {
  ...MessageText,
  HUD: {
    Connecting: `🟡 ${MessageText.Connecting}`,
    Disconnecting: `🟡 ${MessageText.Disconnecting}`,
    Connected: `🟢 ${MessageText.Connected}`,
    Disconnected: `🔴 ${MessageText.Disconnected}`,
    NoActiveConnections: `ℹ️ ${MessageText.NoActiveConnections}`,
    AlreadyActive: `${MessageText.AlreadyActive}`,
  },
} as const

export const ActionTitle = {
  Connect: "Connect",
  Disconnect: "Disconnect",
  MakeQuickConnect: "Make Quick Connect",
  RemoveQuickConnect: "Remove Quick Connect",
  Refresh: "Refresh",
} as const

export const SectionTitle = {
  Active: "Active",
  Disconnected: "Disconnected",
} as const

export const Tooltip = {
  QuickConnectAccessory: "Quick Connect",
} as const

export const Icons = {
  Connected: "connected.png",
  Disconnected: "disconnected.png",
  Changing: "loading.png",
} as const

export const StorageKeys = {
  QuickConnect: "quick-connect",
} as const
