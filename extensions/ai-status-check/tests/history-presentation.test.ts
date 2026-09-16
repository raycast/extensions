import assert from "node:assert/strict";
import test from "node:test";
import { componentHistoryMessage, incidentHistoryMessage } from "../src/domain/status-presentation";

test("empty history messages distinguish successful retrieval, unsupported data, and failed requests", () => {
  assert.equal(incidentHistoryMessage("available").title, "No Recent Incidents");
  assert.equal(incidentHistoryMessage("unavailable").title, "Incident History Unavailable");
  assert.equal(incidentHistoryMessage(undefined).title, "Incident History Unavailable");
  assert.equal(incidentHistoryMessage("unsupported").title, "No Incident History Published");
  assert.match(componentHistoryMessage("unavailable"), /could not be loaded/);
  assert.match(componentHistoryMessage("unsupported"), /No component history is published/);
  assert.doesNotMatch(componentHistoryMessage(undefined), /published/);
  assert.equal(componentHistoryMessage(undefined, true), "Loading component history…");
});
