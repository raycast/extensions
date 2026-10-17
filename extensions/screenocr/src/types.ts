import { LaunchOptions } from "raycast-cross-extension";

export type Language = {
  title: string;
  value: string;
  isDefault?: boolean;
};

export type OCRResult = {
  text: string | null;
  error?: string;
};

export type LaunchContext = {
  callbackLaunchOptions?: LaunchOptions;
};
