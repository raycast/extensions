import { rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { getKeychainToken } from "../src/api/keychain.ts";

describe("getKeychainToken", () => {
  it("rejects with a clear error outside macOS", async (context) => {
    context.mock.property(process, "platform", "win32");

    await rejects(() => getKeychainToken("jira-token"), {
      message: "Keychain Service Name is only supported on macOS. Clear it and set the API Token instead.",
    });
  });
});
