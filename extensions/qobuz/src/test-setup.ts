import { vi } from "vitest";

global.fetch = vi.fn();

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({
    includeSpotify: true,
    includeApple: true,
    includeDeezer: true,
    includeTidal: true,
    includeSonglink: true,
  }),
  Clipboard: {},
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("./client", () => ({
  deepLink: {
    track: (id: number) => `qobuz://track/${id}`,
  },
  BRAND: "#22D3EE",
  appLink: { track: (id: number) => `qobuz://app/track/${id}` },
  formatDuration: (seconds?: number) =>
    seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "",
}));

vi.mock("./resolve", () => ({
  isLikelyMatch: () => true,
}));
