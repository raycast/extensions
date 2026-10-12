import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resourceBlock, ResourceBlock } from "../service/resources";

// OS-derived Low Power Mode must work without depending on a pmset property name.
test("resource decisions suspend unsafe background work", () => {
  const normal = {
    lowPowerMode: false,
    battery: "Now drawing from 'AC Power'",
    memory: "System-wide memory free percentage: 50%",
  };
  assert.equal(resourceBlock(normal, "balanced"), undefined);
  assert.equal(
    resourceBlock({ ...normal, lowPowerMode: true }, "balanced"),
    ResourceBlock.LowPower,
  );
  assert.equal(
    resourceBlock(
      { ...normal, memory: "System-wide memory free percentage: 5%" },
      "balanced",
    ),
    ResourceBlock.Memory,
  );
  assert.equal(
    resourceBlock({ ...normal, battery: "Battery Power" }, "ac-only"),
    ResourceBlock.Charger,
  );
  assert.equal(
    resourceBlock({ ...normal, memory: "unknown response" }, "balanced"),
    ResourceBlock.Unavailable,
  );
});
