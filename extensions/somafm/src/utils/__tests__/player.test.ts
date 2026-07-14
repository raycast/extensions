import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExec, mockSpawn } = vi.hoisted(() => ({
  mockExec: vi.fn(),
  mockSpawn: vi.fn(),
}));

vi.mock("child_process", () => ({
  default: {
    exec: mockExec,
    spawn: mockSpawn,
  },
  exec: mockExec,
  spawn: mockSpawn,
}));

vi.mock("../storage", () => ({
  addToRecentlyPlayed: vi.fn(),
}));

import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spawn } from "child_process";
import { playStation } from "../player";
import { addToRecentlyPlayed } from "../storage";

const mockStation = {
  id: "groovesalad",
  title: "Groove Salad",
  description: "A nicely chilled plate of ambient/downtempo beats",
  dj: "Rusty Hodge",
  genre: "ambient|electronic",
  image: "https://api.somafm.com/img/groovesalad120.png",
  largeimage: "https://api.somafm.com/logos/256/groovesalad256.png",
  xlimage: "https://api.somafm.com/logos/512/groovesalad512.png",
  twitter: "@SomaFM",
  updated: "1234567890",
  playlists: [{ url: "https://api.somafm.com/groovesalad.pls", format: "mp3", quality: "highest" }],
  listeners: "123",
  lastPlaying: "Some Artist - Some Track",
};

type MockToast = Pick<Toast, "style" | "title" | "message" | "hide">;

function createMockChildProcess() {
  const child = new EventEmitter() as EventEmitter & { unref: ReturnType<typeof vi.fn> };
  child.unref = vi.fn();
  return child;
}

function createMockToast(): MockToast {
  return {
    style: Toast.Style.Animated,
    title: "",
    message: "",
    hide: vi.fn(),
  };
}

describe("playStation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPreferenceValues).mockReturnValue({ audioPlayer: "browser" });
  });

  it("records recent playback and closes window after spawn", async () => {
    const toast = createMockToast();
    vi.mocked(showToast).mockResolvedValue(toast as Toast);

    const child = createMockChildProcess();
    vi.mocked(spawn).mockReturnValue(child as never);

    const playPromise = playStation(mockStation);
    process.nextTick(() => child.emit("spawn"));

    await playPromise;

    expect(spawn).toHaveBeenCalledWith("open", ["https://api.somafm.com/groovesalad.pls"], { stdio: "ignore" });
    expect(addToRecentlyPlayed).toHaveBeenCalledWith("groovesalad");
    expect(closeMainWindow).toHaveBeenCalled();
    expect(child.unref).toHaveBeenCalled();
    expect(toast.style).toBe(Toast.Style.Success);
    expect(toast.title).toBe("Playing Groove Salad");
  });

  it("shows failure toast when spawn errors", async () => {
    const toast = createMockToast();
    vi.mocked(showToast).mockResolvedValue(toast as Toast);

    const child = createMockChildProcess();
    vi.mocked(spawn).mockReturnValue(child as never);

    const playPromise = playStation(mockStation);
    process.nextTick(() => child.emit("error", new Error("spawn failed")));

    await playPromise;

    expect(showFailureToast).toHaveBeenCalledWith("spawn failed", {
      title: "Failed to play Groove Salad",
    });
    expect(addToRecentlyPlayed).not.toHaveBeenCalled();
    expect(closeMainWindow).not.toHaveBeenCalled();
    expect(toast.hide).toHaveBeenCalled();
  });
});
