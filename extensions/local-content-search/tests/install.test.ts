import { strict as assert } from "node:assert";
import { test } from "node:test";
import { launchAgent } from "../scripts/agent";
import { paths } from "../service/paths";

// A login service must never invoke a shell or embed user paths as shell commands.
test("launch agent uses explicit arguments and bounded restart behavior", () => {
  const xml = launchAgent(
    '/tmp/Node & "Tools"/node',
    paths("/tmp/Local Search"),
  );
  assert.match(xml, /Node &amp; &quot;Tools&quot;/);
  assert.match(xml, /<key>ThrottleInterval<\/key>\s*<integer>30<\/integer>/);
  assert.match(xml, /<key>ProcessType<\/key>\s*<string>Interactive<\/string>/);
  assert.match(xml, /\/usr\/sbin\/taskpolicy/);
  assert.match(xml, /<string>512<\/string>/);
  assert.doesNotMatch(xml, /\/bin\/(ba)?sh/);
  assert.match(xml, /service.cjs/);
});
