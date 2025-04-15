import { Image, Keyboard, Toast } from "@raycast/api";

export enum Api {
  URL = "https://api-demo.twenty.com/rest",
  KEY = "Authorization",
  USER_GUIDE = "https://twenty.com",
}

export const FailureToast = {
  style: Toast.Style.Failure,
  title: "Something Went Wrong",
  message: "Please try again. If the issue persists, please contact us",
};

export const Shortcuts: { [key: string]: Keyboard.Shortcut } = {
  guide: { modifiers: ["cmd", "shift"], key: "d" },
  preferences: { modifiers: ["cmd"], key: "," },
  status: { modifiers: ["cmd"], key: "s" },
};

export const MenuBarIcon = {
  source: "../assets/logo.png",
  mask: Image.Mask.RoundedRectangle,
};
