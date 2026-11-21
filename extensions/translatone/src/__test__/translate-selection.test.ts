import { beforeEach, describe, expect, test } from "bun:test";
import { raycast } from "../raycast/__test__/test-helpers";
import TranslateSelectionCommand from "../translate-selection";

describe("Translate Selection command", () => {
  beforeEach(() => raycast.reset());

  test("opens the Translate view when nothing is selected", async () => {
    await TranslateSelectionCommand();

    expect(raycast.events).toEqual(["launch:translate:userInitiated"]);
  });
});
