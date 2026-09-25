import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it, mock } from "node:test";
import { clipboardCopy, closeMainWindow, launchCommand, toastHide } from "./raycast-api.mock.ts";

const raycastApiMockUrl = new URL("./raycast-api.mock.ts", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@raycast/api") {
      return { shortCircuit: true, url: raycastApiMockUrl };
    }
    if (specifier === "./hyperlinks" && context.parentURL?.endsWith("/src/utils.ts")) {
      return { shortCircuit: true, url: new URL("../src/hyperlinks.ts", import.meta.url).href };
    }
    return nextResolve(specifier, context);
  },
});

mock.module("got", {
  defaultExport: {
    post: () => ({
      json: async () => ({
        translations: [{ detected_source_language: "EN", text: "Hallo" }],
      }),
    }),
  },
  namedExports: {
    HTTPError: class HTTPError extends Error {},
    RequestError: class RequestError extends Error {},
  },
});

const { sendTranslateRequest } = await import("../src/utils.ts");

describe("main Translate form action", () => {
  it("returns the saved View in Raycast translation for local display", async () => {
    const response = await sendTranslateRequest({
      formality: "default",
      targetLanguage: "DE",
      text: "Hello",
      viewInCurrentCommand: true,
    });

    assert.equal(response?.translation, "Hallo");
    assert.equal(launchCommand.mock.callCount(), 0);
    assert.equal(clipboardCopy.mock.callCount(), 0);
    assert.equal(closeMainWindow.mock.callCount(), 0);
    assert.equal(toastHide.mock.callCount(), 1);
  });

  it("still launches the main command when View is requested elsewhere", async () => {
    await sendTranslateRequest({
      formality: "default",
      targetLanguage: "DE",
      text: "Hello",
    });

    assert.equal(launchCommand.mock.callCount(), 1);
    assert.equal(clipboardCopy.mock.callCount(), 0);
    assert.equal(closeMainWindow.mock.callCount(), 0);
  });
});
