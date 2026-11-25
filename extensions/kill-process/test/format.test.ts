import * as assert from "node:assert/strict";
import { test } from "node:test";
import { formatCpu, formatMemory, formatMemoryDetailed, formatUptime } from "../src/utils/format";

test("formats CPU compactly with one decimal", () => {
  assert.equal(formatCpu(0), "0.0%");
  assert.equal(formatCpu(5.25), "5.3%");
  assert.equal(formatCpu(12.34), "12.3%");
  assert.equal(formatCpu(100), "100.0%");
});

test("handles non-finite CPU values", () => {
  assert.equal(formatCpu(NaN), "0%");
  assert.equal(formatCpu(Infinity), "0%");
});

test("formats memory compactly without spaces using binary units", () => {
  assert.equal(formatMemory(0), "0B");
  assert.equal(formatMemory(1), "1KiB");
  assert.equal(formatMemory(1024), "1MiB");
  assert.equal(formatMemory(102400), "100MiB");
  assert.equal(formatMemory(1048576), "1GiB");
});

test("compact memory output contains no space so accessories fit", () => {
  for (const mem of [512, 1024, 102400, 1048576, 8388608]) {
    const formatted = formatMemory(mem);
    assert.ok(!formatted.includes(" "), `expected no space in "${formatted}"`);
    assert.ok(formatted.length <= 8, `expected "${formatted}" to fit in accessory`);
  }
});

test("handles non-finite or negative memory values", () => {
  assert.equal(formatMemory(NaN), "0B");
  assert.equal(formatMemory(-10), "0B");
});

test("detailed memory keeps higher precision than the compact accessory", () => {
  assert.equal(formatMemoryDetailed(0), "0B");
  assert.equal(formatMemoryDetailed(NaN), "0B");
  // 1150000 KiB compacts to 1.1GiB but the tooltip keeps 1.09 GiB
  assert.equal(formatMemory(1150000), "1.1GiB");
  assert.equal(formatMemoryDetailed(1150000), "1.09 GiB");
});

test("formats uptime with its two largest units", () => {
  assert.equal(formatUptime(0), "0m");
  assert.equal(formatUptime(59), "0m");
  assert.equal(formatUptime(7 * 60), "7m");
  assert.equal(formatUptime(3600), "1h 0m");
  assert.equal(formatUptime(5 * 3600 + 12 * 60 + 40), "5h 12m");
  assert.equal(formatUptime(86400), "1d 0h");
  assert.equal(formatUptime(3 * 86400 + 4 * 3600 + 59 * 60), "3d 4h");
});

test("handles invalid uptime values", () => {
  assert.equal(formatUptime(NaN), "0m");
  assert.equal(formatUptime(-5), "0m");
});
