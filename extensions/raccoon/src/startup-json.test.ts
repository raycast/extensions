import { test } from "node:test";
import assert from "node:assert/strict";
import { loadNow, parseStartup } from "./startup-json.ts";

test("both lists and the counts are read", () => {
	const s = parseStartup(
		'{"user_agents":["mailbrief"],"login_items":["Raycast","Tailscale"],"counts":{"system_agents":7,"daemons":14,"running_services":544},"uptime":"2 days, 13:14","load":"3.21 2.84 2.19"}',
	);
	assert.deepEqual(s.user_agents, ["mailbrief"]);
	assert.equal(s.login_items.length, 2);
	assert.equal(s.counts.daemons, 14);
	assert.equal(s.uptime, "2 days, 13:14");
});

test("a Mac that starts nothing of its own is empty, not undefined", () => {
	const s = parseStartup("{}");
	assert.deepEqual(s.user_agents, []);
	assert.equal(s.counts.running_services, 0);
	assert.equal(s.load, "");
});

test("the load shown is the one-minute average", () => {
	assert.equal(loadNow("3.21 2.84 2.19"), 3.21);
	assert.equal(loadNow(""), null);
	assert.equal(loadNow("N/A"), null);
});

test("output that is not JSON says so", () => {
	assert.throws(() => parseStartup("-- Startup Items"), /did not print JSON/);
});
