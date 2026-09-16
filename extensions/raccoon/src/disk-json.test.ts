import { test } from "node:test";
import assert from "node:assert/strict";
import { fillLevel, fillPercent, parseDisk, smartLevel } from "./disk-json.ts";

test("disks, volumes, container and network mounts are read", () => {
	const d = parseDisk(
		'{"disks":[{"id":"disk0","type":"internal","size":"500.3 GB","mount":"","smart":"Verified"}],"volumes":[{"name":"Data","mount":"/System/Volumes/Data","used":"364Gi","free":"68Gi","percent":"86%"}],"apfs_container":{"reference":"disk3","size":"494.4 GB","free":"68.0 GB"},"network_mounts":[]}',
	);
	assert.equal(d.disks[0].smart, "Verified");
	assert.equal(d.volumes[0].percent, "86%");
	assert.equal(d.apfs_container.reference, "disk3");
	assert.deepEqual(d.network_mounts, []);
});

test("a percentage df did not give is unknown, not zero", () => {
	assert.equal(fillPercent("86%"), 86);
	assert.equal(fillPercent(""), null);
	assert.equal(fillPercent("?"), null);
});

test("fill bands: 75 is tight, 90 is full", () => {
	assert.equal(fillLevel("16%"), "ok");
	assert.equal(fillLevel("75%"), "tight");
	assert.equal(fillLevel("89%"), "tight");
	assert.equal(fillLevel("90%"), "full");
	// Unknown must not read as full and alarm someone for nothing.
	assert.equal(fillLevel(""), "ok");
});

test("SMART has three states, and 'not supported' is not a failure", () => {
	assert.equal(smartLevel("Verified"), "ok");
	assert.equal(smartLevel("Failing"), "failing");
	assert.equal(smartLevel("Not supported"), "unknown");
});

test("output that is not JSON says so", () => {
	assert.throws(() => parseDisk("-- Disk Status"), /did not print JSON/);
});

test("snapshots are read when rcc reports them", () => {
	const doc = JSON.stringify({
		disks: [],
		volumes: [],
		apfs_container: {},
		snapshots: {
			available: true,
			count: 24,
			reclaimable: 24,
			oldest: "2026-09-01-030405",
		},
		network_mounts: [],
	});
	const report = parseDisk(doc);
	assert.equal(report.snapshots.count, 24);
	assert.equal(report.snapshots.reclaimable, 24);
	assert.equal(report.snapshots.oldest, "2026-09-01-030405");
});

test("could not check is not the same answer as none", () => {
	// Without diskutil on PATH rcc cannot look. Reporting 0 would tell someone
	// whose disk is full of snapshots that they have none.
	const blind = JSON.stringify({
		disks: [],
		volumes: [],
		apfs_container: {},
		snapshots: { available: false, count: 0, reclaimable: 0, oldest: "" },
		network_mounts: [],
	});
	assert.equal(parseDisk(blind).snapshots.available, false);
});

test("an rcc too old to know about snapshots reads as not checked", () => {
	const old = JSON.stringify({
		disks: [],
		volumes: [],
		apfs_container: {},
		network_mounts: [],
	});
	const report = parseDisk(old);
	assert.equal(report.snapshots.available, false);
	assert.equal(report.snapshots.count, 0);
});
