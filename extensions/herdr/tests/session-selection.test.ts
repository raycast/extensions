import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSelectedSessionIf, resolveSession, setSelectedSession } from "../src/lib/session-selection";
import { storage } from "./helpers/raycast-api";

vi.mock("@raycast/api", () => import("./helpers/raycast-api"));

const preferences: { sessionName?: string } = {};
vi.mock("../src/lib/preferences", () => ({
  getHerdrPreferences: () => preferences,
}));

beforeEach(() => {
  storage.clear();
  preferences.sessionName = undefined;
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
