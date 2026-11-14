import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import type { Fetch } from "../../core/chat-client";
import { completionResponse, rejectionOf, scriptedFetch } from "../../core/__test__/test-helpers";
import { createProvider, saveProvider } from "../../core/provider-settings";
import { localStore } from "../storage";
import { translateSelectionInPlace } from "../selection";
import { raycast } from "./test-helpers";

function groqAnswering(content: string) {
  return scriptedFetch(new Map([["api.groq.com", async () => completionResponse(content)]]));
}

describe("translateSelectionInPlace", () => {
  const consoleError = spyOn(console, "error");

  beforeEach(async () => {
    raycast.reset();
    await saveProvider(
      localStore,
      createProvider({ id: "groq", apiKey: "groq-key", model: "", baseUrl: "", enabled: true }),
    );
    consoleError.mockImplementation(() => undefined);
  });

  test.each(["Different clipboard text", "Halo dunia", "  Halo dunia  "])(
    "replaces selected text when the clipboard contains %s",
    async (clipboard) => {
      raycast.selectedText = "Halo dunia";
      raycast.clipboard.push(clipboard);
      const { fetch, calls } = groqAnswering("⟦id→en⟧\nHello world");

      await translateSelectionInPlace(fetch);

      expect(calls).toHaveLength(1);
      expect(raycast.toasts[0]).toMatchObject({
        style: "ANIMATED",
        title: "Translating…",
        message: "Default · Auto · English ↔ Indonesian",
      });
      expect(raycast.events).toEqual([
        "toast:Translating…",
        "closeMainWindow",
        "paste:Hello world",
        "hud:Replaced selection · via Groq",
      ]);
    },
  );

  test("offers preferences for invalid settings without sending or pasting text", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.storage.set("providers:v1", "invalid");
    const { fetch, calls } = groqAnswering("unused");

    await translateSelectionInPlace(fetch);

    expect(calls).toHaveLength(0);
    expect(raycast.events).not.toContain("paste:unused");
    expect(raycast.toasts[0]).toMatchObject({
      title: "Check provider settings",
      primaryAction: { title: "Manage Providers" },
    });
  });

  test("surfaces unexpected settings failures instead of hiding them", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.preferences = {
      get defaultTone() {
        throw new Error("Preferences unavailable");
      },
    };
    const { fetch } = groqAnswering("unused");

    expect(await rejectionOf(translateSelectionInPlace(fetch))).toMatchObject({
      message: "Preferences unavailable",
    });
  });

  test("uses the model picked with Choose Model", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.storage.set("model:groq", "llama-3.3-70b-versatile");
    const { fetch, calls } = groqAnswering("Hello world");

    await translateSelectionInPlace(fetch);

    const body = calls[0]?.init.body;
    expect(typeof body === "string" ? JSON.parse(body) : body).toMatchObject({
      model: "llama-3.3-70b-versatile",
    });
  });

  test("uses the tone chosen in preferences", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.preferences = { groqApiKey: "groq-key", defaultTone: "email" };
    const { fetch } = groqAnswering("Hello world");

    await translateSelectionInPlace(fetch);

    expect(raycast.toasts[0]?.message).toBe("Email · Auto · English ↔ Indonesian");
  });

  test.each([
    ["the selection is unreadable", () => undefined],
    [
      "the selection is blank",
      () => {
        raycast.selectedText = "  \n ";
        raycast.clipboard.push("Copied");
      },
    ],
  ])("opens the Translate view when %s", async (_label, arrange) => {
    arrange();
    const { fetch, calls } = groqAnswering("unused");

    await translateSelectionInPlace(fetch);

    expect(calls).toHaveLength(0);
    expect(raycast.events).toEqual(["launch:translate:userInitiated"]);
  });

  test("offers a retry that translates the selection again", async () => {
    raycast.selectedText = "Halo dunia";
    let attempts = 0;
    const flaky: Fetch = async () => {
      attempts += 1;
      return attempts === 1 ? new Response("busy", { status: 503 }) : completionResponse("Hello world");
    };

    await translateSelectionInPlace(flaky);
    const retry = raycast.toasts[1]?.primaryAction;
    expect(retry?.title).toBe("Retry");
    retry?.onAction?.(Object.create(null));
    await Bun.sleep(0);

    expect(raycast.events).toContain("paste:Hello world");
  });

  test.each([new Error("Command is disabled"), "Command is disabled"])(
    "explains when Translate cannot be opened instead of rejecting silently: %s",
    async (failure) => {
      raycast.launchError = failure;
      const { fetch, calls } = groqAnswering("unused");

      await translateSelectionInPlace(fetch);

      expect(calls).toHaveLength(0);
      expect(raycast.toasts[0]).toMatchObject({
        style: "FAILURE",
        title: "Could not open Translate",
        message: expect.stringContaining("disabled"),
      });
    },
  );

  test("reports a failure without touching the selection", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.storage.clear();
    const { fetch } = groqAnswering("unused");

    await translateSelectionInPlace(fetch);

    expect(raycast.events).toEqual(["toast:Translating…", "toast:No provider configured"]);
  });
});
