import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";

import {
  createSourceRow,
  nameFromApplication,
  seedSource,
  validateSourceRow,
  type StoredSource,
} from "../src/domain/source-catalog";
import { openCommandForSource } from "../src/domain/unread-count";
import { loadSourceCatalog, saveSourceCatalog, sourceCatalogStorageKey } from "../src/source-catalog-store";

vi.mock("@raycast/api", () => ({
  LocalStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));

const getItem = vi.mocked(LocalStorage.getItem);
const setItem = vi.mocked(LocalStorage.setItem);

// The seed is expressed as the Messages Application plus its derived fields — no explicit Open Command.
const messagesSeed: StoredSource = {
  id: "messages",
  name: "Messages",
  dockName: "Messages",
  appPath: "/System/Applications/Messages.app",
  enabled: true,
};

const seededCatalog = { version: 1, sources: [messagesSeed] };

function storedEnvelope(sources: unknown): string {
  return JSON.stringify({ version: 1, sources });
}

describe("loadSourceCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stored rows unchanged when the stored envelope is valid, including legacy custom Names, hand-set Dock Item Names, and app-less rows", async () => {
    const rows = [
      { id: "u1", name: "Work Slack", dockName: "Slack", appPath: "/Applications/Slack.app", enabled: true },
      { id: "u2", name: "Telegram", dockName: "Telegram Lite", openCommand: "open -a 'Telegram Lite'", enabled: false },
    ];
    getItem.mockResolvedValue(storedEnvelope(rows));

    await expect(loadSourceCatalog()).resolves.toEqual({ version: 1, sources: rows });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("returns an intentionally emptied catalog without reseeding", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [] }));

    await expect(loadSourceCatalog()).resolves.toEqual({ version: 1, sources: [] });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("seeds the enabled Messages row on first use", async () => {
    getItem.mockResolvedValue(undefined);

    await expect(loadSourceCatalog()).resolves.toEqual(seededCatalog);
    expect(setItem).toHaveBeenCalledWith(sourceCatalogStorageKey, JSON.stringify(seededCatalog));
  });

  it.each([
    ["an unknown version", JSON.stringify({ version: 2, sources: [] })],
    ["a malformed envelope", "not json {"],
    ["a non-array sources list", JSON.stringify({ version: 1, sources: "nope" })],
    ["a non-string id", storedEnvelope([{ ...messagesSeed, id: 42 }])],
    ["an empty name", storedEnvelope([{ ...messagesSeed, name: "" }])],
    ["a whitespace-only Dock item name", storedEnvelope([{ ...messagesSeed, dockName: "   " }])],
    ["a non-boolean enabled flag", storedEnvelope([{ ...messagesSeed, enabled: "yes" }])],
    ["a non-object row", storedEnvelope(["messages"])],
    ["a missing enabled flag", storedEnvelope([{ id: "messages", name: "Messages", dockName: "Messages" }])],
    ["an empty id", storedEnvelope([{ ...messagesSeed, id: "" }])],
    ["a non-string appPath", storedEnvelope([{ ...messagesSeed, appPath: 5 }])],
    ["a null openCommand", storedEnvelope([{ ...messagesSeed, openCommand: null }])],
    ["a null row", storedEnvelope([null])],
  ])("discards and reseeds Messages on %s", async (_label, stored) => {
    getItem.mockResolvedValue(stored);

    await expect(loadSourceCatalog()).resolves.toEqual(seededCatalog);
    expect(setItem).toHaveBeenCalledWith(sourceCatalogStorageKey, JSON.stringify(seededCatalog));
  });

  it("discards and reseeds when two rows share one id", async () => {
    const rows = [
      { id: "dup", name: "Slack", dockName: "Slack", enabled: true },
      { id: "dup", name: "Telegram", dockName: "Telegram Lite", enabled: false },
    ];
    getItem.mockResolvedValue(storedEnvelope(rows));

    await expect(loadSourceCatalog()).resolves.toEqual(seededCatalog);
    expect(setItem).toHaveBeenCalledWith(sourceCatalogStorageKey, JSON.stringify(seededCatalog));
  });

  it("discards and reseeds when any single row is structurally invalid", async () => {
    const rows = [
      { id: "u1", name: "Slack", dockName: "Slack", enabled: true },
      { id: "u2", name: "Telegram", dockName: "", enabled: true },
    ];
    getItem.mockResolvedValue(storedEnvelope(rows));

    await expect(loadSourceCatalog()).resolves.toEqual(seededCatalog);
    expect(setItem).toHaveBeenCalledWith(sourceCatalogStorageKey, JSON.stringify(seededCatalog));
  });
});

describe("saveSourceCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the whole envelope to the single catalog key", async () => {
    const rows: StoredSource[] = [
      { id: "u1", name: "Slack", dockName: "Slack", appPath: "/Applications/Slack.app", enabled: true },
      messagesSeed,
    ];

    await expect(saveSourceCatalog(rows)).resolves.toEqual({ kind: "saved", catalog: { version: 1, sources: rows } });
    expect(setItem).toHaveBeenCalledWith(sourceCatalogStorageKey, storedEnvelope(rows));
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty name without persisting anything", async () => {
    const rows: StoredSource[] = [{ id: "u1", name: "   ", dockName: "Slack", enabled: true }, messagesSeed];

    await expect(saveSourceCatalog(rows)).resolves.toEqual({ kind: "invalid", reason: "Name is required" });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rejects an empty Dock item name without persisting anything", async () => {
    const rows: StoredSource[] = [{ id: "u1", name: "Slack", dockName: "", enabled: true }, messagesSeed];

    await expect(saveSourceCatalog(rows)).resolves.toEqual({ kind: "invalid", reason: "Dock item name is required" });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rejects an Application already linked by another row without persisting anything", async () => {
    const rows: StoredSource[] = [
      { id: "u1", name: "Chat", dockName: "Chat", appPath: "/System/Applications/Messages.app", enabled: true },
      messagesSeed,
    ];

    await expect(saveSourceCatalog(rows)).resolves.toEqual({
      kind: "invalid",
      reason: "Application is already in the Source Catalog",
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("lets an edited row keep its own Application", async () => {
    const rows: StoredSource[] = [messagesSeed];

    await expect(saveSourceCatalog(rows)).resolves.toMatchObject({ kind: "saved" });
  });

  it("checks Application uniqueness against every row, enabled or not", async () => {
    const rows: StoredSource[] = [
      { id: "u1", name: "Slack", dockName: "Slack", appPath: "/Applications/Slack.app", enabled: true },
      { id: "u2", name: "Second Slack", dockName: "Second Slack", appPath: "/Applications/Slack.app", enabled: false },
    ];

    await expect(saveSourceCatalog(rows)).resolves.toMatchObject({ kind: "invalid" });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rejects rows sharing one id without persisting anything", async () => {
    const rows: StoredSource[] = [
      { id: "dup", name: "Slack", dockName: "Slack", enabled: true },
      { id: "dup", name: "Telegram", dockName: "Telegram Lite", enabled: false },
    ];

    await expect(saveSourceCatalog(rows)).resolves.toMatchObject({ kind: "invalid" });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("round-trips saved rows back through load", async () => {
    const rows: StoredSource[] = [
      { id: "u1", name: "Slack", dockName: "Slack", appPath: "/Applications/Slack.app", enabled: true },
      { id: "u2", name: "Telegram", dockName: "Telegram Lite", enabled: false },
    ];

    await saveSourceCatalog(rows);
    getItem.mockResolvedValue(setItem.mock.calls[0][1]);

    await expect(loadSourceCatalog()).resolves.toEqual({ version: 1, sources: rows });
  });
});

describe("validateSourceRow", () => {
  const slack: StoredSource = {
    id: "u1",
    name: "Slack",
    dockName: "Slack",
    appPath: "/Applications/Slack.app",
    enabled: true,
  };
  const telegram: StoredSource = { id: "u2", name: "Telegram", dockName: "Telegram Lite", enabled: false };

  it("accepts a row whose Application is linked by no other row", () => {
    expect(validateSourceRow(slack, [telegram, messagesSeed])).toBeUndefined();
  });

  it("requires a Name", () => {
    expect(validateSourceRow({ ...slack, name: "" }, [])).toBe("Name is required");
  });

  it("requires a Dock item name", () => {
    expect(validateSourceRow({ ...slack, dockName: "  " }, [])).toBe("Dock item name is required");
  });

  it("rejects an Application already linked by another row, excluding the edited row itself", () => {
    expect(validateSourceRow({ ...slack, appPath: "/System/Applications/Messages.app" }, [messagesSeed])).toBe(
      "Application is already in the Source Catalog",
    );
    expect(validateSourceRow(messagesSeed, [messagesSeed])).toBeUndefined();
  });

  it("rejects a duplicate Application against every row, enabled or not", () => {
    expect(validateSourceRow(slack, [{ ...telegram, appPath: "/Applications/Slack.app" }])).toBe(
      "Application is already in the Source Catalog",
    );
  });

  it("never trips the Application check on rows without an Application", () => {
    expect(validateSourceRow(telegram, [slack, messagesSeed])).toBeUndefined();
    expect(validateSourceRow(telegram, [{ ...slack, appPath: undefined }])).toBeUndefined();
  });
});

describe("nameFromApplication", () => {
  it("derives the application's bundle filename minus .app", () => {
    expect(nameFromApplication("/Applications/WhatsApp.app")).toBe("WhatsApp");
    expect(nameFromApplication("/System/Applications/Messages.app")).toBe("Messages");
  });

  it("keeps spaces so divergent Dock names such as Telegram Lite derive correctly", () => {
    expect(nameFromApplication("/Applications/Telegram Lite.app")).toBe("Telegram Lite");
  });

  it("passes a bundle name without the .app suffix through unchanged", () => {
    expect(nameFromApplication("/Applications/Oddity")).toBe("Oddity");
  });
});

describe("createSourceRow", () => {
  it("derives Name and Dock Item Name from the Application's bundle filename; neither is collected", () => {
    const row = createSourceRow({ appPath: "/Applications/WhatsApp.app" });

    expect(row).toEqual({
      id: expect.any(String),
      name: "WhatsApp",
      dockName: "WhatsApp",
      appPath: "/Applications/WhatsApp.app",
      enabled: true,
    });
    expect(row).not.toHaveProperty("openCommand");
  });

  it("assigns a fresh unique id to each new row", () => {
    const first = createSourceRow({ appPath: "/Applications/Slack.app" });
    const second = createSourceRow({ appPath: "/Applications/Telegram.app" });

    expect(first.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(second.id).not.toEqual(first.id);
  });

  it("honors an explicit id so the seed keeps its fixed one", () => {
    expect(createSourceRow({ id: "messages", appPath: "/System/Applications/Messages.app" }).id).toBe("messages");
  });

  it("stores a typed Open Command and trims it", () => {
    expect(createSourceRow({ appPath: "/Applications/Slack.app", openCommand: " open -a Slack " }).openCommand).toBe(
      "open -a Slack",
    );
  });

  it("drops a blank Open Command so the derived default applies", () => {
    expect(createSourceRow({ appPath: "/Applications/Slack.app", openCommand: "   " })).not.toHaveProperty(
      "openCommand",
    );
  });

  it("keeps the seed as the Messages Application plus derived fields, with no explicit Open Command", () => {
    expect(seedSource).toEqual({
      id: "messages",
      name: "Messages",
      dockName: "Messages",
      appPath: "/System/Applications/Messages.app",
      enabled: true,
    });
    expect(seedSource).not.toHaveProperty("openCommand");
  });

  it("resolves the seed's Open Command to the derived default that opens Messages", () => {
    expect(openCommandForSource(seedSource)).toBe("open '/System/Applications/Messages.app'");
  });
});
