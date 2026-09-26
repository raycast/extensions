import assert from "node:assert/strict";
import test from "node:test";
import { load } from "./load-source.mjs";
import * as bookingLocation from "../src/lib/booking-location.ts";
import * as dates from "../src/lib/dates.ts";

function setup(eventOverrides, inputOverrides = {}) {
  const eventType = {
    uri: "https://api.calendly.com/event_types/EXAMPLE",
    name: "Example meeting",
    duration: 30,
    locations: null,
    ...eventOverrides,
  };
  const input = {
    eventTypeUri: eventType.uri,
    inviteeName: "Example Invitee",
    inviteeEmail: "invitee@example.com",
    inviteeTimezone: "UTC",
    startTime: new Date(Date.now() + 3_600_000).toISOString(),
    ...inputOverrides,
  };
  const bodies = [];
  const toasts = [];
  const confirmations = [];
  const meetings = load("../src/api/meetings.ts", {
    "./client": {
      calendlyRequest: async (_path, options) => {
        bodies.push(JSON.parse(options.body));
        return { resource: { uri: "https://api.calendly.com/invitees/EXAMPLE" } };
      },
    },
    "./users": {},
  });
  const eventTypes = {
    getEventType: async () => eventType,
    listEventTypes: async () => [eventType],
    listAvailableTimes: async () => [{ status: "available", start_time: input.startTime }],
  };
  let formOptions;
  const values = {
    eventTypeUri: eventType.uri,
    name: input.inviteeName,
    email: input.inviteeEmail,
    startTime: input.startTime,
    locationIndex: "0",
    locationDetails: input.location ?? "",
  };
  const api = {
    Action: { SubmitForm: "submit" },
    ActionPanel: "actions",
    Alert: { ActionStyle: { Default: "default" } },
    Form: Object.assign(() => null, {
      Dropdown: Object.assign(() => null, { Item: "item" }),
      Separator: "separator",
      TextField: "text",
      Description: "description",
    }),
    Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
    confirmAlert: async (options) => {
      confirmations.push(options);
      return true;
    },
    showToast: async (options) => {
      const toast = typeof options === "object" ? options : {};
      toasts.push(toast);
      return toast;
    },
    useNavigation: () => ({ pop() {} }),
  };
  const utils = {
    withAccessToken: () => (fn) => fn,
    FormValidation: { Required: "required" },
    useCachedPromise: (fn) => ({ data: fn === eventTypes.listEventTypes ? [eventType] : [] }),
    useForm: (options) => {
      formOptions = options;
      return { values, itemProps: {}, handleSubmit() {}, setValue() {} };
    },
  };
  const mocks = { "@raycast/api": api, "@raycast/utils": utils };
  for (const prefix of [".", ".."]) {
    mocks[`${prefix}/api/event-types`] = eventTypes;
    mocks[`${prefix}/api/meetings`] = meetings;
    mocks[`${prefix}/lib/booking-location`] = bookingLocation;
    mocks[`${prefix}/lib/dates`] = dates;
    mocks[`${prefix}/oauth/calendly`] = {};
  }
  const tool = load("../src/tools/book-meeting.ts", mocks).default;
  const form = load("../src/book-meeting.tsx", mocks).BookMeetingForm;
  return {
    bodies,
    toasts,
    confirmations,
    runTool: () => tool(input),
    render: () => form({ eventTypeUri: eventType.uri }),
    submit: () => formOptions.onSubmit(values),
    validateDetails: () => formOptions.validation.locationDetails(values.locationDetails),
  };
}

for (const path of ["form", "tool"]) {
  for (const [name, eventOverrides, inputOverrides, expected] of [
    ["null locations", { locations: null }, {}, undefined],
    ["empty locations", { locations: [] }, {}, undefined],
    [
      "round-robin locations",
      { pooling_type: "round_robin", locations: [{ kind: "outbound_call" }] },
      { locationKind: "outbound_call", location: "ignored" },
      undefined,
    ],
    [
      "outbound phone numbers",
      { locations: [{ kind: "outbound_call" }] },
      { location: "  +1 (415) 555-1234  " },
      { kind: "outbound_call", location: "+1 (415) 555-1234" },
    ],
    [
      "invitee locations",
      { locations: [{ kind: "ask_invitee" }] },
      { location: "  Main office  " },
      { kind: "ask_invitee", location: "Main office" },
    ],
    [
      "configured locations without an invitee override",
      { locations: [{ kind: "physical", location: "Main office" }] },
      { location: "Stale invitee details" },
      { kind: "physical", location: "Main office" },
    ],
  ]) {
    test(`${path} serializes ${name} correctly`, async () => {
      const state = setup(eventOverrides, inputOverrides);
      if (path === "form") {
        state.render();
        await state.submit();
      } else await state.runTool();
      assert.equal(state.bodies.length, 1);
      assert.deepEqual(state.bodies[0].location, expected);
      if (!expected) assert.equal(Object.hasOwn(state.bodies[0], "location"), false);
    });
  }

  for (const [kind, details, message] of [
    ["outbound_call", "", /phone number/],
    ["outbound_call", "not a phone", /valid phone/],
    ["ask_invitee", "   ", /meeting location/],
  ]) {
    test(`${path} rejects ${kind} with invalid invitee details before booking`, async () => {
      const state = setup({ locations: [{ kind }] }, { location: details });
      if (path === "form") {
        state.render();
        assert.match(state.validateDetails(), message);
        await state.submit();
        assert.match(state.toasts[0].message, message);
        assert.equal(state.confirmations.length, 0);
      } else await assert.rejects(state.runTool(), message);
      assert.equal(state.bodies.length, 0);
    });
  }
}

test("AI booking rejects missing or unconfigured location kinds", async () => {
  const event = { locations: [{ kind: "zoom_conference" }, { kind: "ask_invitee" }] };
  for (const input of [{}, { locationKind: "outbound_call", location: "+14155551234" }]) {
    const state = setup(event, input);
    await assert.rejects(state.runTool(), /Choose a location/);
    assert.equal(state.bodies.length, 0);
  }
});

test("form displays invitee details only for locations requiring them", () => {
  for (const [event, expectedTitle] of [
    [{ locations: [{ kind: "outbound_call" }] }, "Invitee Phone Number"],
    [{ locations: [{ kind: "ask_invitee" }] }, "Meeting Location"],
    [{ locations: null }, undefined],
    [{ pooling_type: "round_robin", locations: [{ kind: "outbound_call" }] }, undefined],
  ]) {
    const tree = setup(event).render();
    const titles = tree.props.children.filter(Boolean).map((child) => child.props.title);
    assert.equal(
      titles.find((title) => ["Invitee Phone Number", "Meeting Location"].includes(title)),
      expectedTitle,
    );
    if (!expectedTitle) assert.equal(titles.includes("Location"), false);
  }
});
