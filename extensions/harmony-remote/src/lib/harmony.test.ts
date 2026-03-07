import { LocalStorage, _resetStore } from "@raycast/api";
import {
  getHubIp,
  saveHubIp,
  getCachedConfig,
  getShortcuts,
  saveShortcuts,
  clearAllConfig,
  Shortcut,
  HubConnection,
} from "./harmony";

beforeEach(() => {
  _resetStore();
});

// --- Shortcut Storage ---

describe("shortcut storage", () => {
  const shortcut1: Shortcut = {
    id: "activity-123",
    label: "Watch Xbox",
    icon: "play",
    type: "activity",
    activityId: "123",
  };

  const shortcut2: Shortcut = {
    id: "all-off",
    label: "All Off",
    icon: "power",
    type: "off",
  };

  const shortcut3: Shortcut = {
    id: "cmd-456-VolumeUp-5",
    label: "Receiver: VolumeUp x5",
    icon: "speaker",
    type: "device-command",
    deviceId: "456",
    commandName: "VolumeUp",
    commandType: "IRCommand",
    repeats: 5,
  };

  it("returns empty array when no shortcuts saved", async () => {
    const result = await getShortcuts();
    expect(result).toEqual([]);
  });

  it("saves and loads shortcuts", async () => {
    const shortcuts = [shortcut1, shortcut2, shortcut3];
    await saveShortcuts(shortcuts);
    const loaded = await getShortcuts();
    expect(loaded).toEqual(shortcuts);
  });

  it("overwrites previous shortcuts on save", async () => {
    await saveShortcuts([shortcut1, shortcut2]);
    await saveShortcuts([shortcut3]);
    const loaded = await getShortcuts();
    expect(loaded).toEqual([shortcut3]);
  });

  it("preserves shortcut order", async () => {
    const ordered = [shortcut3, shortcut1, shortcut2];
    await saveShortcuts(ordered);
    const loaded = await getShortcuts();
    expect(loaded.map((s) => s.id)).toEqual(["cmd-456-VolumeUp-5", "activity-123", "all-off"]);
  });

  it("preserves all device-command fields through round-trip", async () => {
    await saveShortcuts([shortcut3]);
    const [loaded] = await getShortcuts();
    expect(loaded.deviceId).toBe("456");
    expect(loaded.commandName).toBe("VolumeUp");
    expect(loaded.commandType).toBe("IRCommand");
    expect(loaded.repeats).toBe(5);
  });
});

// --- Hub IP Storage ---

describe("hub IP storage", () => {
  it("returns null when no hub IP saved", async () => {
    const ip = await getHubIp();
    expect(ip).toBeNull();
  });

  it("saves and loads hub IP", async () => {
    await saveHubIp("192.168.1.100");
    const ip = await getHubIp();
    expect(ip).toBe("192.168.1.100");
  });
});

// --- Config Cache ---

describe("hub config cache", () => {
  it("returns null when no config cached", async () => {
    const config = await getCachedConfig();
    expect(config).toBeNull();
  });

  it("returns config when fresh", async () => {
    const config = {
      devices: [{ id: "1", name: "TV", commands: [] }],
      activities: [{ id: "100", name: "Watch TV" }],
      timestamp: Date.now(),
    };
    await LocalStorage.setItem("harmony-hub-config", JSON.stringify(config));
    const cached = await getCachedConfig();
    expect(cached).not.toBeNull();
    expect(cached!.devices).toHaveLength(1);
    expect(cached!.activities).toHaveLength(1);
  });

  it("returns null when config is expired (>24h)", async () => {
    const config = {
      devices: [{ id: "1", name: "TV", commands: [] }],
      activities: [],
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
    };
    await LocalStorage.setItem("harmony-hub-config", JSON.stringify(config));
    const cached = await getCachedConfig();
    expect(cached).toBeNull();
  });

  it("returns null when config has no devices", async () => {
    const config = {
      devices: [],
      activities: [{ id: "100", name: "Watch TV" }],
      timestamp: Date.now(),
    };
    await LocalStorage.setItem("harmony-hub-config", JSON.stringify(config));
    const cached = await getCachedConfig();
    expect(cached).toBeNull();
  });
});

// --- Clear All Config ---

describe("clearAllConfig", () => {
  it("removes hub IP, config, and shortcuts", async () => {
    await saveHubIp("192.168.1.100");
    await saveShortcuts([{ id: "x", label: "X", icon: "x", type: "off" }]);
    await LocalStorage.setItem("harmony-hub-config", JSON.stringify({ devices: [], activities: [], timestamp: 0 }));

    await clearAllConfig();

    expect(await getHubIp()).toBeNull();
    expect(await getShortcuts()).toEqual([]);
    expect(await getCachedConfig()).toBeNull();
  });
});

// --- Shortcut Execution ---

describe("shortcut execution", () => {
  function makeMockClient() {
    return {
      startActivity: jest.fn(),
      turnOff: jest.fn(),
      send: jest.fn(),
      end: jest.fn(),
    };
  }

  function makeHub(client: ReturnType<typeof makeMockClient>) {
    const config = {
      devices: [{ id: "456", name: "Receiver", commands: [] }],
      activities: [{ id: "123", name: "Watch Xbox" }],
      timestamp: Date.now(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new HubConnection(client as any, config);
  }

  it("executes activity shortcut", async () => {
    const client = makeMockClient();
    const hub = makeHub(client);

    const result = await hub.executeShortcut({
      id: "activity-123",
      label: "Watch Xbox",
      icon: "play",
      type: "activity",
      activityId: "123",
    });

    expect(client.startActivity).toHaveBeenCalledWith("123");
    expect(result).toBe("Watch Xbox");
  });

  it("executes off shortcut", async () => {
    const client = makeMockClient();
    const hub = makeHub(client);

    const result = await hub.executeShortcut({
      id: "all-off",
      label: "All Off",
      icon: "power",
      type: "off",
    });

    expect(client.turnOff).toHaveBeenCalled();
    expect(result).toBe("All Off");
  });

  it("executes device command with repeats", async () => {
    const client = makeMockClient();
    const hub = makeHub(client);

    const result = await hub.executeShortcut({
      id: "cmd-456-VolumeUp-3",
      label: "Volume Up x3",
      icon: "speaker",
      type: "device-command",
      deviceId: "456",
      commandName: "VolumeUp",
      commandType: "IRCommand",
      repeats: 3,
    });

    expect(result).toBe("Volume Up x3");
    // 3 repeats = 3 holdAction + 3 releaseAction = 6 send calls
    expect(client.send).toHaveBeenCalledTimes(6);
    expect(client.send).toHaveBeenCalledWith("holdAction", {
      command: "VolumeUp",
      deviceId: "456",
      type: "IRCommand",
    });
    expect(client.send).toHaveBeenCalledWith("releaseAction", {
      command: "VolumeUp",
      deviceId: "456",
      type: "IRCommand",
    });
  });

  it("defaults to 1 repeat when not specified", async () => {
    const client = makeMockClient();
    const hub = makeHub(client);

    await hub.executeShortcut({
      id: "cmd-456-Mute-1",
      label: "Mute",
      icon: "speaker",
      type: "device-command",
      deviceId: "456",
      commandName: "Mute",
      commandType: "IRCommand",
    });

    // 1 repeat = 1 holdAction + 1 releaseAction
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it("throws on activity shortcut missing activityId", async () => {
    const client = makeMockClient();
    const hub = makeHub(client);

    await expect(
      hub.executeShortcut({
        id: "bad",
        label: "Bad",
        icon: "x",
        type: "activity",
      }),
    ).rejects.toThrow("Shortcut missing activityId");
  });

  it("throws on device-command shortcut missing deviceId", async () => {
    const client = makeMockClient();
    const hub = makeHub(client);

    await expect(
      hub.executeShortcut({
        id: "bad",
        label: "Bad",
        icon: "x",
        type: "device-command",
        commandName: "VolumeUp",
      }),
    ).rejects.toThrow("Shortcut missing device/command info");
  });

  it("throws on unknown shortcut type", async () => {
    const client = makeMockClient();
    const hub = makeHub(client);

    await expect(
      hub.executeShortcut({
        id: "bad",
        label: "Bad",
        icon: "x",
        type: "unknown" as Shortcut["type"],
      }),
    ).rejects.toThrow("Unknown shortcut type: unknown");
  });
});
