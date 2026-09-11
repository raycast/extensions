import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSelectedSessionIf,
  pinSession,
  releaseSessionPin,
  resolveSession,
  resolveStoredSession,
  setSelectedSession,
} from "../src/lib/session-selection";
import { snapshotOfSession } from "../src/hooks/use-herdr-snapshot";
import { storage } from "./helpers/raycast-api";

vi.mock("@raycast/api", () => import("./helpers/raycast-api"));

const preferences: { sessionName?: string } = {};
vi.mock("../src/lib/preferences", () => ({
  getHerdrPreferences: () => preferences,
}));

beforeEach(() => {
  storage.clear();
  preferences.sessionName = undefined;
  releaseSessionPin();
});

describe("resolveSession", () => {
  it("prefers an explicit session, including the empty opt-out", async () => {
    storage.set("selectedSession", "tmp-b");
    preferences.sessionName = "work";

    await expect(resolveSession("tmp-a")).resolves.toBe("tmp-a");
    await expect(resolveSession("")).resolves.toBe("");
  });

  it("resolves the Selected Session ahead of the Preferred Session", async () => {
    storage.set("selectedSession", "tmp-b");
    preferences.sessionName = "work";

    await expect(resolveSession()).resolves.toBe("tmp-b");
  });

  it("falls back to the Preferred Session, then to Herdr's default", async () => {
    preferences.sessionName = "work";
    await expect(resolveSession()).resolves.toBe("work");

    preferences.sessionName = undefined;
    await expect(resolveSession()).resolves.toBe("default");
  });

  it("ignores a blank stored selection", async () => {
    storage.set("selectedSession", "  ");
    preferences.sessionName = "work";

    await expect(resolveSession()).resolves.toBe("work");
  });
});

describe("clearSelectedSessionIf", () => {
  it("clears only a matching selection", async () => {
    await setSelectedSession("tmp-b");

    await clearSelectedSessionIf("tmp-a");
    expect(storage.get("selectedSession")).toBe("tmp-b");

    await clearSelectedSessionIf("tmp-b");
    expect(storage.has("selectedSession")).toBe(false);
  });
});

// A view command resolves its Session once and pins it, so an action fired from
// that view targets the Session on screen even after another command changes
// the stored selection.
describe("pinSession", () => {
  it("outranks the stored selection until it is released", async () => {
    storage.set("selectedSession", "tmp-b");

    const release = pinSession("tmp-a");
    await expect(resolveSession()).resolves.toBe("tmp-a");

    release();
    await expect(resolveSession()).resolves.toBe("tmp-b");
  });

  it("never outranks an explicit session", async () => {
    pinSession("tmp-a");

    await expect(resolveSession("tmp-c")).resolves.toBe("tmp-c");
    await expect(resolveSession("")).resolves.toBe("");
  });

  it("follows a selection made while it is held", async () => {
    const release = pinSession("tmp-a");

    await setSelectedSession("tmp-b");
    await expect(resolveSession()).resolves.toBe("tmp-b");

    release();
  });

  it("releases only its own pin", async () => {
    storage.set("selectedSession", "tmp-c");
    const stale = pinSession("tmp-a");
    pinSession("tmp-b");

    stale();
    await expect(resolveSession()).resolves.toBe("tmp-b");
  });
});

// Regression: the cache keeps the previous Session's data while the next loads,
// so a view rendered one Session's resources under another Session's name.
describe("snapshotOfSession", () => {
  const snapshot = { workspaces: [], tabs: [], panes: [], agents: [] } as never;

  it("returns the snapshot only for the session it was read from", () => {
    expect(snapshotOfSession({ session: "tmp-a", snapshot }, "tmp-a")).toBe(snapshot);
    expect(snapshotOfSession({ session: "tmp-a", snapshot }, "tmp-b")).toBeUndefined();
    expect(snapshotOfSession(undefined, "tmp-a")).toBeUndefined();
  });
});

// Regression: the view's periodic refresh resolved through its own pin, so it
// could never observe a selection made in another command. The menu bar runs
// in its own long-lived process, so it stayed on the session it started with.
describe("resolveStoredSession", () => {
  it("reads the stored selection past any pin", async () => {
    storage.set("selectedSession", "tmp-b");
    preferences.sessionName = "work";
    pinSession("tmp-a");

    await expect(resolveStoredSession()).resolves.toBe("tmp-b");
    await expect(resolveSession()).resolves.toBe("tmp-a");
  });

  it("falls back to the Preferred Session, then to Herdr's default", async () => {
    pinSession("tmp-a");
    preferences.sessionName = "work";
    await expect(resolveStoredSession()).resolves.toBe("work");

    preferences.sessionName = undefined;
    await expect(resolveStoredSession()).resolves.toBe("default");
  });
});
