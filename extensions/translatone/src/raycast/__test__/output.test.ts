import { beforeEach, describe, expect, test } from "bun:test";
import { deliverTranslation } from "../output";
import { raycast } from "./test-helpers";

describe("deliverTranslation", () => {
  beforeEach(() => raycast.reset());

  test("closes Raycast, pastes into the previous app, then confirms", async () => {
    await deliverTranslation("paste", "Hello", "Pasted · via Groq");

    expect(raycast.events).toEqual(["closeMainWindow", "paste:Hello", "hud:Pasted · via Groq"]);
    expect(raycast.huds[0]?.popToRootType).toBe("immediate");
  });

  test("copies to the clipboard and confirms without pasting", async () => {
    await deliverTranslation("copy", "Hello", "Copied · via Groq");

    expect(raycast.clipboard).toEqual(["Hello"]);
    expect(raycast.events).toEqual(["hud:Copied · via Groq"]);
  });
});

describe("deliverTranslation replace", () => {
  beforeEach(() => raycast.reset());

  test("pastes over the selection like a paste", async () => {
    await deliverTranslation("replace", "Hello", "Replaced selection · via Groq");

    expect(raycast.events).toEqual(["closeMainWindow", "paste:Hello", "hud:Replaced selection · via Groq"]);
  });
});
