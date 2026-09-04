import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";

import {
  addSourceDraft,
  addSourceRow,
  defaultOpenCommand,
  editSourceDraft,
  moveSource,
  removeSource,
  sourceFormErrors,
  toggleSourceEnabled,
  updateSourceRow,
} from "../src/domain/configure-sources";
import type { StoredSource } from "../src/domain/source-catalog";
import { enabledSources, menuPresentation, summarizeDockScan } from "../src/domain/unread-count";
import { loadSourceCatalog, saveSourceCatalog } from "../src/source-catalog-store";

vi.mock("@raycast/api", () => ({
  LocalStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));

const getItem = vi.mocked(LocalStorage.getItem);
const setItem = vi.mocked(LocalStorage.setItem);

const messages: StoredSource = {
  id: "messages",
  name: "Messages",
  dockName: "Messages",
  appPath: "/System/Applications/Messages.app",
  openCommand: "open /System/Applications/Messages.app",
  enabled: true,
};
const slack: StoredSource = {
  id: "slack",
  name: "Slack",
  dockName: "Slack",
  appPath: "/Applications/Slack.app",
  enabled: false,
};
const telegram: StoredSource = { id: "telegram", name: "Telegram", dockName: "Telegram Lite", enabled: true };

describe("toggleSourceEnabled", () => {
  it("flips only the target row's enabled flag, preserving order and fields", () => {
    expect(toggleSourceEnabled([slack, messages, telegram], telegram.id)).toEqual([
      slack,
      messages,
      { ...telegram, enabled: false },
    ]);
  });

  it("does not mutate the stored rows", () => {
    const rows = [slack, telegram];
    toggleSourceEnabled(rows, slack.id);

    expect(rows).toEqual([slack, telegram]);
  });

  it("returns a new array so component state updates re-render", () => {
    const rows = [slack];

    expect(toggleSourceEnabled(rows, slack.id)).not.toBe(rows);
  });

  it("leaves the rows unchanged for an unknown id", () => {
    expect(toggleSourceEnabled([slack], "nope")).toEqual([slack]);
  });
});

describe("removeSource", () => {
  it("removes only the target row, keeping the remaining order", () => {
    expect(removeSource([slack, messages, telegram], messages.id)).toEqual([slack, telegram]);
  });

  it("does not mutate the stored rows and tolerates an unknown id", () => {
    const rows = [slack, messages];

    expect(removeSource(rows, "nope")).toEqual(rows);
    expect(removeSource(rows, "nope")).not.toBe(rows);
    expect(rows).toEqual([slack, messages]);
  });

  it("empties the catalog when the only row is removed", () => {
    expect(removeSource([messages], messages.id)).toEqual([]);
  });
});

describe("moveSource", () => {
  it("moves a row up by swapping it with the earlier row in its section, preserving every field", () => {
    expect(moveSource([slack, messages, telegram], telegram.id, "up")).toEqual([slack, telegram, messages]);
  });

  it("moves a row down by swapping it with the later row in its section", () => {
    expect(moveSource([messages, slack, telegram], messages.id, "down")).toEqual([telegram, slack, messages]);
  });

  it("never crosses the Active/Disabled split: a lone row in its section stays put", () => {
    // slack is the only Disabled row, so 'down' has no same-section neighbor
    // to swap with even though rows below it are stored adjacent.
    expect(moveSource([slack, messages, telegram], slack.id, "down")).toEqual([slack, messages, telegram]);
  });

  it("leaves the rows unchanged when the row is already at the edge of its section", () => {
    expect(moveSource([slack, messages], slack.id, "up")).toEqual([slack, messages]);
    expect(moveSource([slack, messages], messages.id, "down")).toEqual([slack, messages]);
  });

  it("does not mutate the stored rows and returns a new array even for a no-op", () => {
    const rows = [slack, messages];
    const moved = moveSource(rows, slack.id, "up");

    expect(rows).toEqual([slack, messages]);
    expect(moved).not.toBe(rows);
  });

  it("tolerates an unknown id", () => {
    expect(moveSource([slack], "nope", "down")).toEqual([slack]);
  });
});

describe("persisted edits from the command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists a toggle immediately and the menu reload reflects it", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [slack, messages] }));
    const catalog = await loadSourceCatalog();

    const result = await saveSourceCatalog(toggleSourceEnabled(catalog.sources, slack.id));
    expect(result).toMatchObject({ kind: "saved" });

    const persisted = JSON.parse(setItem.mock.calls[0][1] as string) as { sources: StoredSource[] };
    expect(persisted.sources).toEqual([{ ...slack, enabled: true }, messages]);

    // The menu's next refresh cycle loads the Catalog again and reads the new enabled selection.
    getItem.mockResolvedValue(setItem.mock.calls[0][1]);
    await expect(loadSourceCatalog()).resolves.toEqual({ version: 1, sources: persisted.sources });
  });

  it("removing the last row persists an empty catalog that loads as empty without reseeding", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [messages] }));
    const catalog = await loadSourceCatalog();

    const result = await saveSourceCatalog(removeSource(catalog.sources, messages.id));
    expect(result).toEqual({ kind: "saved", catalog: { version: 1, sources: [] } });

    const stored = setItem.mock.calls[0][1] as string;
    expect(JSON.parse(stored)).toEqual({ version: 1, sources: [] });

    setItem.mockClear();
    getItem.mockResolvedValue(stored);
    await expect(loadSourceCatalog()).resolves.toEqual({ version: 1, sources: [] });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("persists a reorder and the menu's next refresh reads the new insertion order", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [messages, slack, telegram] }));
    const catalog = await loadSourceCatalog();

    // Two 'up' hotkey presses on Telegram's row: each move reads the freshly
    // saved rows. The first press swaps Telegram with Messages; the second is
    // a no-op because Telegram is then alone at the top of its section.
    const once = moveSource(catalog.sources, telegram.id, "up");
    const result = await saveSourceCatalog(moveSource(once, telegram.id, "up"));
    expect(result).toMatchObject({ kind: "saved" });

    // List rows render in stored insertion order, so the menu's Source order follows.
    getItem.mockResolvedValue(setItem.mock.calls[0][1]);
    expect((await loadSourceCatalog()).sources.map((row) => row.id)).toEqual(["telegram", "slack", "messages"]);
  });

  it("shows the menu's no-sources prompt on the next refresh after the only Source is disabled", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [messages] }));
    const catalog = await loadSourceCatalog();
    await saveSourceCatalog(toggleSourceEnabled(catalog.sources, messages.id));

    getItem.mockResolvedValue(setItem.mock.calls[0][1]);
    const enabledRows = enabledSources((await loadSourceCatalog()).sources);

    expect(menuPresentation(summarizeDockScan(enabledRows, { kind: "success", outcomes: {} }))).toMatchObject({
      status: "No sources enabled",
    });
  });
});

describe("defaultOpenCommand", () => {
  it("single-quotes the app path so paths with spaces open correctly", () => {
    expect(defaultOpenCommand("/Applications/Google Chrome.app")).toBe("open '/Applications/Google Chrome.app'");
  });

  it("escapes embedded single quotes like the menu's derived default", () => {
    expect(defaultOpenCommand("/Applications/Bob's App.app")).toBe("open '/Applications/Bob'\\''s App.app'");
  });
});

describe("addSourceDraft", () => {
  it("derives Name and Dock Item Name from the chosen Application; the form collects neither", () => {
    expect(addSourceDraft({ appPath: "/Applications/WhatsApp.app" })).toEqual({
      id: "",
      name: "WhatsApp",
      dockName: "WhatsApp",
      appPath: "/Applications/WhatsApp.app",
      enabled: true,
    });
  });

  it("carries no id, so the duplicate check excludes nothing", () => {
    expect(addSourceDraft({ appPath: "/Applications/Slack.app" }).id).toBe("");
  });

  it("trims a typed Open Command and drops a blank one", () => {
    expect(addSourceDraft({ appPath: "/Applications/Slack.app", openCommand: "  open -a Slack " }).openCommand).toBe(
      "open -a Slack",
    );
    expect(addSourceDraft({ appPath: "/Applications/Slack.app", openCommand: "   " })).not.toHaveProperty(
      "openCommand",
    );
  });
});

describe("editSourceDraft", () => {
  it("replaces only the Open Command; Application, Name, and Dock Item Name stay fixed", () => {
    expect(editSourceDraft(messages, { openCommand: "open -a Messages" })).toEqual({
      ...messages,
      openCommand: "open -a Messages",
    });
  });

  it("keeps a legacy app-less row app-less and trims its typed Open Command", () => {
    expect(editSourceDraft(telegram, { openCommand: " open -a 'Telegram Lite' " })).toEqual({
      ...telegram,
      openCommand: "open -a 'Telegram Lite'",
    });
  });

  it("drops a cleared Open Command, including on a row that had one", () => {
    expect(editSourceDraft(messages, { openCommand: "   " })).not.toHaveProperty("openCommand");
    expect(editSourceDraft(telegram, {})).toEqual(telegram);
  });

  it("keeps the row's id and enabled flag", () => {
    const draft = editSourceDraft(slack, { openCommand: "open -a Slack" });

    expect(draft.id).toBe(slack.id);
    expect(draft.enabled).toBe(false);
  });
});

describe("sourceFormErrors", () => {
  it("accepts a draft whose Application is linked by no other row", () => {
    const draft = addSourceDraft({ appPath: "/Applications/WhatsApp.app" });
    expect(sourceFormErrors(draft, [messages, slack, telegram])).toEqual({});
  });

  it("blocks an Application already in the Source Catalog with an inline error on the Application field", () => {
    const draft = addSourceDraft({ appPath: "/Applications/Slack.app" });
    expect(sourceFormErrors(draft, [messages, slack, telegram])).toEqual({
      appPath: "Application is already in the Source Catalog",
    });
  });

  it("does not trip when an edited row keeps its own Application", () => {
    const draft = editSourceDraft(slack, { openCommand: "open -a Slack" });
    expect(sourceFormErrors(draft, [messages, slack, telegram])).toEqual({});
  });

  it("never flags a legacy draft without an Application", () => {
    expect(sourceFormErrors(editSourceDraft(telegram, { openCommand: "open -a 'Telegram Lite'" }), [telegram])).toEqual(
      {},
    );
  });

  it("leaves failures the forms cannot produce to the storage core instead of mislabeling them", () => {
    // A draft failing a rule the forms cannot produce — here an empty derived
    // Name from a degenerate bundle filename — shows no inline error;
    // saveSourceCatalog stays authoritative and rejects it at save.
    const degenerate = { ...addSourceDraft({ appPath: "/Applications/.app" }), name: "" };
    expect(sourceFormErrors(degenerate, [])).toEqual({});
  });
});

describe("addSourceRow", () => {
  it("appends an enabled row with derived Name and Dock Item Name and a fresh id", () => {
    const rows = addSourceRow([slack], { appPath: "/Applications/WhatsApp.app" });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(slack);
    expect(rows[1]).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
      name: "WhatsApp",
      dockName: "WhatsApp",
      appPath: "/Applications/WhatsApp.app",
      enabled: true,
    });
  });

  it("stores a typed Open Command and never reuses an existing id", () => {
    const stored = [messages];
    const rows = addSourceRow(stored, { appPath: "/Applications/WhatsApp.app", openCommand: "open -a WhatsApp" });

    expect(stored).toEqual([messages]);
    expect(rows[1].openCommand).toBe("open -a WhatsApp");
    expect(rows[1].id).not.toBe(messages.id);
  });
});

describe("updateSourceRow", () => {
  it("replaces the edited row in place, keeping its id, identity, and enabled flag", () => {
    const draft = editSourceDraft(telegram, { openCommand: "open -a 'Telegram Lite'" });
    const rows = updateSourceRow([messages, telegram], draft);

    expect(rows).toEqual([messages, { ...draft }]);
    expect(rows[1].id).toBe(telegram.id);
    expect(rows[1].enabled).toBe(true);
  });

  it("keeps a disabled edited row disabled across edits", () => {
    const rows = updateSourceRow([slack], editSourceDraft(slack, {}));

    expect(rows[0].enabled).toBe(false);
  });

  it("drops an Open Command the edit cleared", () => {
    const rows = updateSourceRow([messages], editSourceDraft(messages, {}));

    expect(rows[0]).not.toHaveProperty("openCommand");
  });

  it("does not mutate the stored rows and tolerates an unknown id", () => {
    const stored = [messages];
    const draft = editSourceDraft({ ...messages, id: "nope" }, {});
    const rows = updateSourceRow(stored, draft);

    expect(stored).toEqual([messages]);
    expect(rows).toEqual([messages]);
    expect(rows).not.toBe(stored);
  });
});

describe("persisted form edits from the command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists an added Source and the next menu refresh reads it as an enabled row", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [messages] }));
    const catalog = await loadSourceCatalog();

    const result = await saveSourceCatalog(addSourceRow(catalog.sources, { appPath: "/Applications/WhatsApp.app" }));
    expect(result).toMatchObject({ kind: "saved" });
    expect(setItem).toHaveBeenCalledTimes(1);

    getItem.mockResolvedValue(setItem.mock.calls[0][1]);
    const enabledRows = enabledSources((await loadSourceCatalog()).sources);

    expect(enabledRows.map((row) => row.dockName)).toEqual(["Messages", "WhatsApp"]);
    expect(enabledRows[1].id).not.toBe("messages");
  });

  it("shows an added Source whose app is not pinned to the Dock as Not Available in the menu", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [messages] }));
    const catalog = await loadSourceCatalog();
    await saveSourceCatalog(addSourceRow(catalog.sources, { appPath: "/Applications/WhatsApp.app" }));

    getItem.mockResolvedValue(setItem.mock.calls[0][1]);
    const enabledRows = enabledSources((await loadSourceCatalog()).sources);
    const result = summarizeDockScan(enabledRows, {
      kind: "success",
      outcomes: { messages: { kind: "badge", badge: "3" }, [enabledRows[1].id]: { kind: "notAvailable" } },
    });

    expect(result.aggregate).toMatchObject({ kind: "partial" });
    expect(result.sources.find((source) => source.id === enabledRows[1].id)).toMatchObject({
      name: "WhatsApp",
      label: "Not available",
    });
    expect(menuPresentation(result)).toMatchObject({ status: "Partial Result (incomplete)" });
  });

  it("blocks saving an Add whose Application is already in the Source Catalog without persisting anything", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [messages] }));
    const catalog = await loadSourceCatalog();

    const result = await saveSourceCatalog(
      addSourceRow(catalog.sources, { appPath: "/System/Applications/Messages.app" }),
    );

    expect(result).toMatchObject({ kind: "invalid", reason: "Application is already in the Source Catalog" });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("persists a legacy app-less row's Open Command edit without touching its identity", async () => {
    getItem.mockResolvedValue(JSON.stringify({ version: 1, sources: [{ ...telegram, openCommand: undefined }] }));
    const catalog = await loadSourceCatalog();

    const draft = editSourceDraft(telegram, { openCommand: "open -a 'Telegram Lite'" });
    const result = await saveSourceCatalog(updateSourceRow(catalog.sources, draft));
    expect(result).toMatchObject({ kind: "saved" });

    getItem.mockResolvedValue(setItem.mock.calls[0][1]);
    const rows = (await loadSourceCatalog()).sources;
    expect(rows[0]).toEqual({ ...telegram, openCommand: "open -a 'Telegram Lite'" });
  });
});
