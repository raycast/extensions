import { test } from "node:test";
import assert from "node:assert/strict";
import {
	capacityHealth,
	chargeHealth,
	conditionHealth,
	cycleHealth,
	parseBattery,
	chargingLabel,
} from "./battery-json.ts";

const full = JSON.stringify({
	present: true,
	cycle_count: 694,
	max_capacity_percent: 85,
	condition: "Normal",
	charging: false,
	fully_charged: true,
	charge_percent: 100,
});

test("a full report is read field by field", () => {
	const b = parseBattery(full);
	assert.equal(b.present, true);
	assert.equal(b.cycle_count, 694);
	assert.equal(b.fully_charged, true);
});

test("a Mac with no battery is a report, not a failure", () => {
	const b = parseBattery(
		JSON.stringify({
			present: false,
			cycle_count: null,
			max_capacity_percent: null,
			condition: null,
			charging: false,
			fully_charged: false,
			charge_percent: null,
		}),
	);
	assert.equal(b.present, false);
	assert.equal(b.cycle_count, null);
});

test("an rcc older than 0.17.0 has no present field, and is not called absent", () => {
	const b = parseBattery(
		JSON.stringify({ cycle_count: 12, max_capacity_percent: 99 }),
	);
	assert.equal(b.present, true);
});

test("capacity bands follow Apple's service threshold", () => {
	assert.equal(capacityHealth(100), "good");
	assert.equal(capacityHealth(80), "good");
	assert.equal(capacityHealth(79), "fair");
	assert.equal(capacityHealth(60), "fair");
	assert.equal(capacityHealth(59), "poor");
	assert.equal(capacityHealth(null), "neutral");
});

test("cycle bands are measured against the 1000 rating", () => {
	assert.equal(cycleHealth(0), "good");
	assert.equal(cycleHealth(499), "good");
	assert.equal(cycleHealth(500), "fair");
	assert.equal(cycleHealth(799), "fair");
	assert.equal(cycleHealth(800), "poor");
	assert.equal(cycleHealth(null), "neutral");
});

test("charge bands say how much is left", () => {
	assert.equal(chargeHealth(100), "good");
	assert.equal(chargeHealth(20), "fair");
	assert.equal(chargeHealth(19), "poor");
	assert.equal(chargeHealth(null), "neutral");
});

test("only Normal is a good condition, and case does not decide it", () => {
	assert.equal(conditionHealth("Normal"), "good");
	assert.equal(conditionHealth("normal"), "good");
	assert.equal(conditionHealth("Service Recommended"), "poor");
	assert.equal(conditionHealth(null), "neutral");
	assert.equal(conditionHealth(""), "neutral");
});

test("output that is not JSON says so", () => {
	assert.throws(
		() => parseBattery("-- Battery Status"),
		/did not print JSON/,
	);
	assert.throws(() => parseBattery("   "), /printed nothing/);
	assert.throws(() => parseBattery("[1,2]"), /not a report object/);
});

test("on AC and not charging is holding the charge, not running on battery", () => {
	const base = {
		present: true,
		power_source: "ac" as const,
		cycle_count: 694,
		max_capacity_percent: 85,
		condition: "Normal",
		charging: false,
		fully_charged: false,
		charge_percent: 83,
	};
	assert.match(chargingLabel(base), /on AC/);
	assert.equal(
		chargingLabel({ ...base, power_source: "battery" }),
		"No, on battery",
	);
	// An rcc that did not say where the power comes from gets no guess.
	assert.equal(chargingLabel({ ...base, power_source: null }), "No");
	assert.equal(chargingLabel({ ...base, charging: true }), "Yes");
});
