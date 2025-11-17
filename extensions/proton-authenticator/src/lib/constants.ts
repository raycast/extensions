import { Color } from "@raycast/api";

export const STORAGE_KEYS = {
  PROTON_EXPORT: "RAYCAST_PROTON_AUTH_DATA",
};

export const STATE_KEYS = {
  ACCOUNTS: "accounts",
  NEEDS_SETUP: "needs-setup",
  SORTING_MODE: "sorting-mode",
};

// colors are inspired from the Proton Authenticator app
export const COLORS: Record<"light" | "dark", Record<string, { main: string; background: string }>> = {
  light: {
    purple: {
      main: Color.Purple,
      background: "#E3D6FE",
    },
    orange: {
      main: Color.Orange,
      background: "#FFE8D6",
    },
    red: {
      main: Color.Red,
      background: "#FFD6D6",
    },
  },
  dark: {
    purple: {
      main: Color.Purple,
      background: "#604F77",
    },
    orange: {
      main: Color.Orange,
      background: "#7A624E",
    },
    red: {
      main: Color.Red,
      background: "#7E5353",
    },
  },
};
