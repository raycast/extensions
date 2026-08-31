import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterNamedTriggers, isTriggerEnabled } from "./trigger-utils";

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
      filterNamedTriggers(triggers, false).map((trigger) => trigger.id),
      [1, 2],
    );
  });

  it("includes disabled named triggers when requested", () => {
    assert.deepEqual(
      filterNamedTriggers(triggers, true).map((trigger) => trigger.id),
      [1, 2, 3],
    );
  });
});
