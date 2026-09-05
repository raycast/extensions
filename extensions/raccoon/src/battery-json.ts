import { expectObject } from "./json-out.ts";

/**
 * `rcc battery --json`, read as rows a reader can judge at a glance.
 *
 * The CLI reports measurements and says nothing about whether they are good.
 * The bands below are that judgement, kept here rather than in the view so the
 * thresholds are visible and tested instead of buried in JSX.
 */

export type BatteryReport = {
	present: boolean;
	/** "ac", "battery", or null from an rcc that did not say. */
	power_source: "ac" | "battery" | null;
	cycle_count: number | null;
	max_capacity_percent: number | null;
	condition: string | null;
	charging: boolean;
	fully_charged: boolean;
	charge_percent: number | null;
};

/** Green, orange, red. Nothing decorative, and nothing outside these three. */
export type Health = "good" | "fair" | "poor" | "neutral";

export function parseBattery(stdout: string): BatteryReport {
	const r = expectObject(stdout, "battery");
	const num = (v: unknown) => (typeof v === "number" ? v : null);
	return {
		// present arrived with the no-battery fix; an older rcc that reports a
		// cycle count clearly has one.
		present:
			typeof r.present === "boolean"
				? r.present
				: num(r.cycle_count) !== null,
		power_source:
			r.power_source === "ac" || r.power_source === "battery"
				? r.power_source
				: null,
		cycle_count: num(r.cycle_count),
		max_capacity_percent: num(r.max_capacity_percent),
		condition: typeof r.condition === "string" ? r.condition : null,
		charging: r.charging === true,
		fully_charged: r.fully_charged === true,
		charge_percent: num(r.charge_percent),
	};
}

/**
 * Capacity as a fraction of new. Apple calls a battery due for service below
 * 80%, which is where the warning starts; 60% is where it is worth acting on
 * rather than noting.
 */
export function capacityHealth(percent: number | null): Health {
	if (percent === null) return "neutral";
	if (percent >= 80) return "good";
	if (percent >= 60) return "fair";
	return "poor";
}

/**
 * Cycles used. Modern Mac batteries are rated for 1000, so 500 is halfway and
 * 800 is close enough to plan for.
 */
export function cycleHealth(cycles: number | null): Health {
	if (cycles === null) return "neutral";
	if (cycles < 500) return "good";
	if (cycles < 800) return "fair";
	return "poor";
}

/**
 * What the charging row says. "Not charging" on its own hid the difference
 * between a MacBook on its adapter with macOS holding the charge — the
 * ordinary desk state — and one running down; the old row called both "on
 * battery".
 */
export function chargingLabel(b: BatteryReport): string {
	if (b.fully_charged) {
		return b.power_source === "ac"
			? "No, full and on AC"
			: "No, fully charged";
	}
	if (b.charging) return "Yes";
	if (b.power_source === "ac") return "No, on AC and holding the charge";
	if (b.power_source === "battery") return "No, on battery";
	return "No";
}

/** How much is left right now. */
export function chargeHealth(percent: number | null): Health {
	if (percent === null) return "neutral";
	if (percent >= 50) return "good";
	if (percent >= 20) return "fair";
	return "poor";
}

/** Apple's own word for it. Anything but Normal is worth reading. */
export function conditionHealth(condition: string | null): Health {
	if (condition === null || condition === "") return "neutral";
	return condition.toLowerCase() === "normal" ? "good" : "poor";
}
