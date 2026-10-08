import { BridgeSupportedOS } from "./interface";

export const PRODUCT_TITLE: Record<BridgeSupportedOS, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

export const PRODUCT_ICON: Record<BridgeSupportedOS, string> = {
  macos: "os/apple.png",
  windows: "os/windows.png",
  linux: "os/linux.png",
};
