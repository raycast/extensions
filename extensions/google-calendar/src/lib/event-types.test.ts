import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALL_LISTABLE_EVENT_TYPES,
  BIRTHDAYS_VIEW_CALENDAR_ID,
  resolveCalendarIdForEventsList,
  resolveEventTypesForList,
  resolvePickerCalendarId,
  SCHEDULE_EVENT_TYPES,
} from "./event-types";

describe("resolveEventTypesForList", () => {
  it("excludes birthdays on the primary calendar by default", () => {
    assert.deepEqual(resolveEventTypesForList({ calendarId: "primary", showBirthdays: false }), SCHEDULE_EVENT_TYPES);
    assert.ok(!resolveEventTypesForList({ calendarId: null, showBirthdays: false }).includes("birthday"));
  });

  it("includes birthdays when the preference is enabled", () => {
    assert.deepEqual(resolveEventTypesForList({ calendarId: "primary", showBirthdays: true }), [
      ...ALL_LISTABLE_EVENT_TYPES,
    ]);
  });

  it("requests only birthdays on the Contacts birthdays calendar", () => {
    assert.deepEqual(
      resolveEventTypesForList({
        calendarId: "addressbook#contacts@group.v.calendar.google.com",
        showBirthdays: false,
      }),
      ["birthday"],
    );
  });

  it("requests only birthdays for the virtual Birthdays picker view", () => {
    assert.deepEqual(resolveEventTypesForList({ calendarId: BIRTHDAYS_VIEW_CALENDAR_ID, showBirthdays: false }), [
      "birthday",
    ]);
    assert.deepEqual(resolveEventTypesForList({ calendarId: BIRTHDAYS_VIEW_CALENDAR_ID, showBirthdays: true }), [
      "birthday",
    ]);
  });
});

describe("resolvePickerCalendarId", () => {
  it("maps Contacts birthdays calendars onto the virtual Birthdays picker value", () => {
    assert.equal(
      resolvePickerCalendarId("addressbook#contacts@group.v.calendar.google.com"),
      BIRTHDAYS_VIEW_CALENDAR_ID,
    );
    assert.equal(resolvePickerCalendarId("#contacts@group.v.calendar.google.com"), BIRTHDAYS_VIEW_CALENDAR_ID);
    assert.equal(resolvePickerCalendarId(BIRTHDAYS_VIEW_CALENDAR_ID), BIRTHDAYS_VIEW_CALENDAR_ID);
    assert.equal(resolvePickerCalendarId("primary"), "primary");
    assert.equal(resolvePickerCalendarId(undefined), undefined);
  });
});

describe("resolveCalendarIdForEventsList", () => {
  it("reads the virtual Birthdays view from the primary calendar", () => {
    assert.equal(resolveCalendarIdForEventsList(BIRTHDAYS_VIEW_CALENDAR_ID), "primary");
    assert.equal(resolveCalendarIdForEventsList(null), "primary");
    assert.equal(
      resolveCalendarIdForEventsList("addressbook#contacts@group.v.calendar.google.com"),
      "addressbook#contacts@group.v.calendar.google.com",
    );
  });
});
