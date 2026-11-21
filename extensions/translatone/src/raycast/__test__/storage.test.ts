import { beforeEach, describe, expect, test } from "bun:test";
import { localStore } from "../storage";
import { raycast } from "./test-helpers";

describe("localStore", () => {
  beforeEach(() => raycast.reset());

  test("persists values in Raycast LocalStorage", async () => {
    await localStore.setItem("usage:groq", "3");

    expect(raycast.storage.get("usage:groq")).toBe("3");
    expect(await localStore.getItem("usage:groq")).toBe("3");
  });

  test("returns undefined for missing keys", async () => {
    expect(await localStore.getItem("missing")).toBeUndefined();
  });
});
