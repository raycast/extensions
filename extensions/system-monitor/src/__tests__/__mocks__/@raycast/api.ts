export enum Color {
  Green = "green",
  Yellow = "yellow",
  Orange = "orange",
  Red = "red",
  SecondaryText = "secondaryText",
}

export enum Icon {
  Circle = "circle",
}

export const Toast = {
  Style: { Success: "success", Failure: "failure", Animated: "animated" },
} as const;

export const Alert = {
  ActionStyle: { Destructive: "destructive" },
} as const;

export enum LaunchType {
  UserInitiated = "userInitiated",
  Background = "background",
}

export const Image = {
  Mask: { Circle: "circle", RoundedRectangle: "roundedRectangle" },
} as const;

export class Cache {
  private store = new Map<string, string>();

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }
}

export const environment = {
  assetsPath: "/tmp/assets",
  launchType: LaunchType.UserInitiated,
};

export const LocalStorage = {
  getItem: async () => undefined,
  setItem: async () => undefined,
};

export const getPreferenceValues = <T>() => ({}) as T;

export const showToast = async () => undefined;

export const confirmAlert = async () => false;
