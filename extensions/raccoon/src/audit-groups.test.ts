import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGroups, splitGroups } from "./audit-groups.ts";

const LIST_CHECKS = `Check groups (use with --only, e.g. --only core,network):

  core         FileVault, SIP, Gatekeeper, Firewall, Stealth Mode, Software Updates
  network      Open Ports, DNS Servers, VPN, Bluetooth, Sharing, SSH Daemon
  auth         Auto-Login, Keychain, SSH Keys, Authorized Keys, Sudoers
  persistence  User/System LaunchAgents, LaunchDaemons, Cron Jobs, At Jobs, Login Items
  privacy      Location Services, Analytics (deep scan only)
  additional   XProtect, Screen Lock, .ssh Permissions, Quarantined Files, Kernel Extensions
`;

test("the groups are read from what rcc lists, header and all", () => {
	assert.deepEqual(parseGroups(LIST_CHECKS), ["core", "network", "auth", "persistence", "privacy", "additional"]);
});

test("a listing that says nothing yields nothing, rather than a group called Check", () => {
	assert.deepEqual(parseGroups(""), []);
	assert.deepEqual(parseGroups("Check groups (use with --only, e.g. --only core,network):\n"), []);
});

test("the split keeps every group, with the slow one on its own", () => {
	const plan = splitGroups(parseGroups(LIST_CHECKS));
	assert.deepEqual(plan, {
		fast: ["network", "auth", "persistence", "privacy", "additional"],
		slow: "core",
	});
});

test("no split is offered when the listing is not one this knows", () => {
	// An rcc whose groups were renamed must be run whole, not run half.
	assert.equal(splitGroups(["everything"]), undefined);
	assert.equal(splitGroups(["core"]), undefined);
	assert.equal(splitGroups([]), undefined);
});
