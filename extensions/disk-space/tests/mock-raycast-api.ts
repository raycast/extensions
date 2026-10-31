// Mock implementation of @raycast/api for standalone test execution outside Raycast
export enum Color {
  Red = "raycast-color-red",
  Orange = "raycast-color-orange",
  Yellow = "raycast-color-yellow",
  Green = "raycast-color-green",
  Blue = "raycast-color-blue",
  Purple = "raycast-color-purple",
  Magenta = "raycast-color-magenta",
  PrimaryText = "raycast-color-primary-text",
  SecondaryText = "raycast-color-secondary-text",
}

export enum Icon {
  HardDrive = "hard-drive-16",
  MemoryStick = "memory-stick-16",
  Network = "network-16",
  Cd = "cd-16",
  Folder = "folder-16",
  Download = "download-16",
  Upload = "upload-16",
  Plug = "plug-16",
  Check = "check-16",
  Xmark = "xmark-16",
}

export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
    Animated: "ANIMATED",
  },
};

export const Alert = {
  ActionStyle: {
    Default: "DEFAULT",
    Destructive: "DESTRUCTIVE",
    Cancel: "CANCEL",
  },
};

export async function showToast(options: any): Promise<any> {
  return {
    style: options.style,
    title: options.title,
    message: options.message,
    hide: () => {},
  };
}

export async function confirmAlert(options: any): Promise<boolean> {
  return true;
}

export const Clipboard = {
  copy: async (text: string) => {},
  readText: async () => "",
};

export async function open(target: string): Promise<void> {}
