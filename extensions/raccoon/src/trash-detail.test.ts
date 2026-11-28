import assert from "node:assert/strict";
import { test } from "node:test";
import { trashDetail, volumeName } from "./trash-detail.ts";

const home = { path: "/Users/me/.Trash", size: "464K", count: 4 };

test("with nothing else mounted the detail is what is in this trash", () => {
	assert.equal(trashDetail({ ...home, volumes: [] }), "4 items, 464K");
});

test("one item is not one items", () => {
	assert.equal(trashDetail({ ...home, count: 1, volumes: [] }), "1 item, 464K");
});

test("a mounted volume's trash is counted, because Finder empties that too", () => {
	const t = {
		...home,
		volumes: [{ path: "/Volumes/Backup/.Trashes/501", size: "12G", count: 812 }],
	};
	assert.equal(
		trashDetail(t),
		"4 items, 464K here, and 812 items on 1 other volume. Emptying the trash empties every volume.",
	);
});

test("two volumes are two volumes", () => {
	const t = {
		...home,
		volumes: [
			{ path: "/Volumes/Backup/.Trashes/501", size: "12G", count: 812 },
			{ path: "/Volumes/Photos/.Trashes/501", size: "3G", count: 8 },
		],
	};
	assert.match(trashDetail(t), /820 items on 2 other volumes/);
});

test("a volume's trash is named after the volume, not after the path it sits in", () => {
	assert.equal(volumeName("/Volumes/Backup/.Trashes/501"), "Backup");
	assert.equal(volumeName("/Volumes/My Disk/.Trashes/501"), "My Disk");
});

test("a path that is not under /Volumes is shown as it is", () => {
	assert.equal(volumeName("/Users/me/.Trash"), "/Users/me/.Trash");
});
