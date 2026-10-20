import { test } from "node:test";
import assert from "node:assert/strict";
import { frequencyOf, HOW_OFTEN, scheduleSection } from "./audit-schedule.ts";

const plist = (interval: string) =>
	`<plist><dict><key>StartCalendarInterval</key><dict>${interval}</dict></dict></plist>`;

test("the frequency is read from the interval keys rcc writes", () => {
	assert.equal(frequencyOf(plist("<key>Weekday</key><integer>0</integer>")), "weekly");
	assert.equal(frequencyOf(plist("<key>Day</key><integer>1</integer>")), "monthly");
	assert.equal(frequencyOf(plist("<key>Hour</key><integer>9</integer>")), "daily");
});

test("a schedule that could not be read is not a schedule that is off", () => {
	// readSchedule rejects on anything but ENOENT, and usePromise then leaves
	// data undefined - which used to render as "Not scheduled", telling the
	// reader a deep audit does not run when it may well be running.
	assert.deepEqual(scheduleSection(undefined, true), {
		title: "Could not be read",
		subtitle: "Whether an audit runs on its own is unknown",
	});
});

test("no plist and no error is the honest 'off'", () => {
	assert.deepEqual(scheduleSection(undefined, false), {
		title: "Not scheduled",
		subtitle: "No audit runs on its own",
	});
});

test("a schedule in place names itself and when it runs", () => {
	assert.deepEqual(scheduleSection("weekly", false), {
		title: "Running weekly",
		subtitle: "Sundays at 9:00",
	});
});

test("an action names the frequency the way an action names things", () => {
	// Raycast's own convention is Title Case for action titles, and "Run the
	// Audit daily" ends in a lowercase word because the frequency is a value,
	// not a label.
	assert.equal(HOW_OFTEN.daily, "Daily");
	assert.equal(HOW_OFTEN.weekly, "Weekly");
	assert.equal(HOW_OFTEN.monthly, "Monthly");
});
