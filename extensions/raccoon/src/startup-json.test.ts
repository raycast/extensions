import { test } from "node:test";
import assert from "node:assert/strict";
import { loadNow, parseStartup } from "./startup-json.ts";

test("both lists and the counts are read", () => {
	const s = parseStartup(
		'{"user_agents":["mailbrief"],"login_items":["Raycast","Tailscale"],"counts":{"system_agents":7,"daemons":14,"running_services":544},"uptime":"2 days, 13:14","load":"3.21 2.84 2.19"}',
	);
	// An rcc before 0.19 listed agents by short name: readable, but with no
	// label there is nothing to stop them by.
	assert.equal(s.user_agents[0].name, "mailbrief");
	assert.equal(s.user_agents[0].label, "");
	assert.equal(s.counts.loaded_services, null);
	assert.equal(s.login_items_error, "");
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

test("an agent carries launchd's label, whether it is loaded, and by which plist", () => {
	const s = parseStartup(
		JSON.stringify({
			user_agents: [
				{
					label: "com.adobe.GC.Scheduler-1.0",
					name: "GC.Invoker-1.0",
					file: "/Users/me/Library/LaunchAgents/com.adobe.GC.Invoker-1.0.plist",
					loaded: true,
					loaded_from:
						"/Users/me/Library/LaunchAgents/com.adobe.GC.Invoker-1.0.plist",
				},
				{
					label: "com.adobe.ccxprocess",
					name: "ccxprocess",
					file: "/Users/me/Library/LaunchAgents/com.adobe.ccxprocess.plist",
					loaded: false,
					loaded_from:
						"/Library/LaunchAgents/com.adobe.ccxprocess.plist",
				},
			],
			background_items: [
				{ label: "com.microsoft.teams2.agent", pid: 1832 },
				{ label: "com.ollama.ollama", pid: null },
			],
			login_items: ["Raycast", "Raycast Beta"],
			login_items_missing: ["Raycast Beta"],
			login_items_error: "",
			counts: {
				system_agents: 7,
				system_agents_loaded: 5,
				daemons: 14,
				running_services: 187,
				loaded_services: 539,
			},
		}),
	);
	// The filename says Invoker; the label says Scheduler. bootout takes the label.
	assert.equal(s.user_agents[0].label, "com.adobe.GC.Scheduler-1.0");
	assert.equal(s.user_agents[1].loaded, false);
	assert.equal(s.background_items[0].pid, 1832);
	assert.equal(s.background_items[1].pid, null);
	assert.deepEqual(s.login_items_missing, ["Raycast Beta"]);
	assert.equal(s.counts.system_agents_loaded, 5);
	assert.equal(s.counts.loaded_services, 539);
});

test("login items that could not be read are an error, not an empty list", () => {
	const s = parseStartup(
		'{"login_items":[],"login_items_error":"Not authorized to send Apple events to System Events. (-1743)"}',
	);
	assert.deepEqual(s.login_items, []);
	assert.match(s.login_items_error, /Not authorized/);
});
