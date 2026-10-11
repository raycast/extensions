/**
 * All user-facing copy.
 *
 * Raycast only supports US English, so the text lives here as plain English instead of going through a
 * localization layer.
 */
export const strings = {
  fileShare: "File Share",
  searchPlaceholder: "Share a link, a QR code and a list",
  refresh: "Refresh",
  openPreferences: "Open Extension Preferences",

  statusRunning: "Sharing Is On",
  statusStopped: "Sharing Is Off",
  statusUnknown: "Session State Unknown",
  statusConflict: "Port Already Taken",
  statusNoInterface: "No Network Interface",
  startHint: "Start sharing to get a link and a QR code.",

  start: "Start Sharing",
  stop: "Stop Sharing",
  restart: "Restart Service",
  copyAddress: "Copy Address",
  openInBrowser: "Open in Browser",
  restartNeeded: "Restart Needed",
  restartNeededDetail:
    "The port or interface changed. The service keeps its old address until it is restarted.",
  changePort: "Change Port",

  interfaceDropdown: "Network Interface",
  shareLink: "Share Link",
  qrCode: "QR Code",
  switchInterfaceTitle: (name: string, address: string) =>
    `Share on ${name} (${address})?`,
  switchInterfaceMessage:
    "The service has to restart to listen on the new interface. Visitors using the current address will be disconnected.",
  interfaceWillApplyOnStart: (address: string) => `Interface saved: ${address}`,
  later: "Later",
  noInterfaceDetail:
    "No interface with an IPv4 address is available right now. Connect to Wi-Fi or Ethernet and refresh.",

  shareSelection: "Share Finder Selection",
  addItems: "Add Files Or Folders…",
  addItemsTitle: "Add To Share List",
  addItemsPath: "Files Or Folders",
  addItemsHint:
    "Everything picked here stays where it is — the list only references the path.",
  addItemsSubmit: "Add To Share List",
  nothingSelected: "Nothing Selected",
  nothingSelectedHint:
    "Select the files or folders in Finder first, then run this again.",
  referencedInPlace: "Referenced in place — nothing was copied.",
  added: (count: number) => `Added ${count} ${count === 1 ? "item" : "items"}`,
  addFailed: "Could not add to the share list",
  itemCount: (count: number) => `${count} ${count === 1 ? "item" : "items"}`,

  openReceiveDirectory: "Open Receive Directory",

  unreachableAfterStart:
    "The service started but its page is not reachable. macOS may have blocked incoming connections — allow them and try again.",
};
