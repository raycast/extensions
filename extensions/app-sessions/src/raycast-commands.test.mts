import assert from "node:assert/strict";
import test from "node:test";
import { executeRaycastCommandSteps, getRaycastCommandLabel, parseRaycastCommandDeeplink } from "./raycast-commands.ts";

test("parses and executes Raycast command deeplinks in order", async () => {
  const caffeinate = "raycast://extensions/mooxl/coffee/caffeinate";
  const decaffeinate = "raycast://extensions/mooxl/coffee/decaffeinate";
  const launched: string[] = [];

  assert.deepEqual(parseRaycastCommandDeeplink(caffeinate), {
    ownerOrAuthorName: "mooxl",
    extensionName: "coffee",
    name: "caffeinate",
  });
  assert.equal(getRaycastCommandLabel(caffeinate), "Caffeinate · Coffee");
  assert.equal(parseRaycastCommandDeeplink("https://example.com"), undefined);

  await executeRaycastCommandSteps(
    [
      { id: "1", deeplink: caffeinate, waitBeforeMs: 0 },
      { id: "2", deeplink: decaffeinate, waitBeforeMs: 0 },
    ],
    async (command) => {
      launched.push(command.name);
    },
  );

  assert.deepEqual(launched, ["caffeinate", "decaffeinate"]);
});
