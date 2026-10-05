import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterNamedTriggers, isTriggerEnabled, parseNamedTriggerReferences } from "./trigger-utils";

describe("named trigger state", () => {
  it("treats omitted enabled flags as enabled", () => {
    assert.equal(isTriggerEnabled({}), true);
    assert.equal(isTriggerEnabled({ BTTEnabled: 1, BTTEnabled2: 1 }), true);
  });

  it("treats either explicit disabled flag as disabled", () => {
    assert.equal(isTriggerEnabled({ BTTEnabled: 0 }), false);
    assert.equal(isTriggerEnabled({ BTTEnabled2: 0 }), false);
  });
});

describe("named trigger filtering", () => {
  const triggers = [
    { BTTTriggerName: "Enabled without flags", id: 1 },
    { BTTTriggerName: "Enabled", BTTEnabled: 1 as const, BTTEnabled2: 1 as const, id: 2 },
    { BTTTriggerName: "Disabled", BTTEnabled: 0 as const, BTTEnabled2: 0 as const, id: 3 },
    { id: 4 },
  ];

  it("shows enabled named triggers by default", () => {
    assert.deepEqual(
      filterNamedTriggers(triggers, "enabled").map((trigger) => trigger.id),
      [1, 2],
    );
  });

  it("shows only disabled named triggers when requested", () => {
    assert.deepEqual(
      filterNamedTriggers(triggers, "disabled").map((trigger) => trigger.id),
      [3],
    );
  });

  it("includes enabled and disabled named triggers when showing all", () => {
    assert.deepEqual(
      filterNamedTriggers(triggers, "all").map((trigger) => trigger.id),
      [1, 2, 3],
    );
  });
});

describe("named trigger reference cache", () => {
  it("parses valid trigger references and drops malformed entries", () => {
    assert.deepEqual(
      parseNamedTriggerReferences(
        JSON.stringify([{ name: "First", uuid: "first-uuid" }, { name: "Missing UUID" }, null]),
      ),
      [{ name: "First", uuid: "first-uuid" }],
    );
  });

  it("handles missing or invalid cache data", () => {
    assert.deepEqual(parseNamedTriggerReferences(undefined), []);
    assert.deepEqual(parseNamedTriggerReferences("not json"), []);
    assert.deepEqual(parseNamedTriggerReferences("{}"), []);
  });
});
