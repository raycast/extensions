import { test } from "node:test";
import assert from "node:assert/strict";
import {
	displayName,
	gigabytes,
	megabytes,
	parseMemory,
	pressure,
	weight,
} from "./memory-json.ts";

test("the machine's figures and the process list are both read", () => {
	const r = parseMemory(
		JSON.stringify({
			memory: {
				total_mb: 16384,
				used_mb: 11902,
				wired_mb: 2790,
				active_mb: 1730,
				cached_mb: 1150,
				compressed_mb: 7381,
				swap_total_mb: 10240,
				swap_used_mb: 8483,
				swap_free_mb: 1756,
			},
			processes: [
				{
					pid: 75398,
					footprint_kb: 24117248,
					rss_kb: 110464,
					command: "/x/python",
				},
			],
		}),
	);
	assert.equal(r.memory?.compressed_mb, 7381);
	// Footprint, not RSS, is what the row is about: 23 GB here, 108 MB there.
	assert.equal(megabytes(r.processes[0].footprint_kb), 23552);
	assert.equal(megabytes(r.processes[0].rss_kb), 108);
});

test("an rcc before 0.19 sent the process list alone, ranked by rss", () => {
	const r = parseMemory(
		JSON.stringify([{ pid: 1, rss: 586256, command: "claude" }]),
	);
	assert.equal(r.memory, null);
	assert.equal(r.processes[0].footprint_kb, 586256);
	assert.equal(r.processes[0].rss_kb, 586256);
});

test("kilobytes read as megabytes and gigabytes the way a person does", () => {
	assert.equal(megabytes(586256), 573);
	assert.equal(megabytes(0), 0);
	assert.equal(gigabytes(11902), "11.6");
});

test("weight bands are measured in megabytes, not kilobytes", () => {
	assert.equal(weight(100 * 1024), "light");
	assert.equal(weight(512 * 1024), "heavy");
	assert.equal(weight(1023 * 1024), "heavy");
	assert.equal(weight(1024 * 1024), "huge");
});

test("pressure reads swap and the compressor, not free memory", () => {
	const idle = {
		total_mb: 16384,
		used_mb: 6000,
		wired_mb: 2000,
		active_mb: 3000,
		cached_mb: 4000,
		compressed_mb: 500,
		swap_total_mb: 0,
		swap_used_mb: 0,
		swap_free_mb: 0,
	};
	assert.equal(pressure(idle), "light");
	assert.equal(pressure({ ...idle, swap_used_mb: 300 }), "heavy");
	// 7.4 GB compressed on 16 GB, 8.4 GB of swap: the machine that froze.
	assert.equal(
		pressure({ ...idle, compressed_mb: 7381, swap_used_mb: 8483 }),
		"huge",
	);
});

test("the name is the last path component, not the whole path", () => {
	assert.equal(
		displayName("/Applications/Safari.app/Contents/MacOS/Safari"),
		"Safari",
	);
	assert.equal(displayName("claude"), "claude");
	assert.equal(displayName("/"), "/");
});

test("output that is not a memory report says so", () => {
	assert.throws(() => parseMemory("-- Memory Usage"), /did not print JSON/);
	assert.throws(
		() => parseMemory(JSON.stringify({ processes: [{ pid: 1 }] })),
		/Process 1 is not shaped/,
	);
});
