import { test } from "node:test";
import assert from "node:assert/strict";
import { frequencyOf } from "./audit-schedule.ts";

const plist = (interval: string) =>
	`<plist><dict><key>StartCalendarInterval</key><dict>${interval}</dict></dict></plist>`;

test("the frequency is read from the interval keys rcc writes", () => {
	assert.equal(
		frequencyOf(plist("<key>Weekday</key><integer>0</integer>")),
		"weekly",
	);
	assert.equal(
		frequencyOf(plist("<key>Day</key><integer>1</integer>")),
		"monthly",
	);
	assert.equal(
		frequencyOf(plist("<key>Hour</key><integer>9</integer>")),
		"daily",
	);
});
