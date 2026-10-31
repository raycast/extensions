import { afterEach, describe, expect, it } from "vitest";
import { FolnaroError, classifyToolError } from "../src/lib/errors";
import { menuState } from "../src/lib/menu-state";
import { describeError } from "../src/lib/presentation";
import { harness, type Harness } from "./helpers";

let current: Harness | undefined;
afterEach(() => current?.client.close());

describe("A program that is not approved in Settings > Agents", () => {
  it("gets the kind notApproved from tools/list and offers to open Folnaro", async () => {
    const h = (current = harness("not-approved.json"));
    const error = await h.api.allowedTools().catch((failure) => failure);
    expect(error).toMatchObject({ kind: "notApproved", code: -32001 });
    expect(describeError(error)).toMatchObject({
      title: "Allow Raycast in Folnaro first",
      needsUserAction: true,
      offerOpenFolnaro: true,
    });
  });

  it("gets the kind notApproved from a tool result as well", async () => {
    const h = (current = harness("not-approved.json"));
    const error = await h.api.runningTimer().catch((failure) => failure);
    expect(error.kind).toBe("notApproved");
  });

  it("recognizes the denied and unidentified wordings", () => {
    const denied =
      "This program (Raycast) isn’t allowed to access Folnaro. Only the user can change that, in Folnaro under Settings > Agents.";
    const unidentified =
      "Folnaro couldn’t identify this program. It is listed as “Unidentified program” and has no access yet.";
    expect(classifyToolError("time_running", denied).kind).toBe("notApproved");
    expect(classifyToolError("time_running", unidentified).kind).toBe("notApproved");
    expect(classifyToolError("time_running", "Something else failed.").kind).toBe("tool");
  });
});

describe("Running timer menu state", () => {
  const entry = { id: "T-1", started_at: "2026-01-01T09:00:00Z" } as never;

  it("shows the cached timer while the refresh works", () => {
    expect(menuState({ entry, name: "Website" }, undefined)).toMatchObject({
      entry,
      name: "Website",
      unavailable: false,
    });
  });

  it("drops the cached timer after an error so no clock keeps running", () => {
    const state = menuState({ entry, name: "Website" }, new FolnaroError("timeout", "slow"));
    expect(state).toMatchObject({ entry: null, unavailable: true, unavailableKey: "menu.unavailable" });
  });

  it("asks for approval when that is the error", () => {
    const state = menuState({ entry }, new FolnaroError("notApproved", "no access"));
    expect(state).toMatchObject({ entry: null, unavailable: true, unavailableKey: "menu.notApproved" });
  });
});
