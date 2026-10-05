import assert from "node:assert/strict";
import test from "node:test";
import {
  createBusyCalNaturalLanguageItem,
  createBusyCalEvent,
  createBusyCalTask,
  deleteBusyCalEvent,
  deleteBusyCalTask,
  findNextBusyCalAvailable,
  listBusyCalCalendars,
  openBusyCalAutomationItem,
  queryBusyCalItems,
} from "../src/busycal-automation";
import { resolveBusyCalInstallation } from "../src/busycal-installation";

const runIntegration = process.env.BUSYCAL_RAYCAST_RUN_INTEGRATION_TESTS === "1";
const runMutating = process.env.BUSYCAL_RAYCAST_RUN_MUTATING_TESTS === "1";
const configuredEventTestCalendarID = normalizedEnvValue(
  process.env.BUSYCAL_RAYCAST_TEST_EVENT_CALENDAR_ID,
);
const configuredTaskTestCalendarID = normalizedEnvValue(
  process.env.BUSYCAL_RAYCAST_TEST_TASK_CALENDAR_ID,
);

test(
  "resolveBusyCalInstallation finds a supported BusyCal bundle",
  { skip: !runIntegration },
  async () => {
    const installation = await resolveBusyCalInstallation();

    assert.match(
      installation.bundleId,
      /^com\.busymac\.busycal(3|-setapp)$/,
    );
    assert.ok(installation.appPath.endsWith(".app"));
  },
);

test(
  "listBusyCalCalendars returns calendars with BusyCal metadata",
  { skip: !runIntegration },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const calendars = await listBusyCalCalendars(installation);

    assert.ok(calendars.length > 0);
    assert.ok(calendars.some((calendar) => calendar.title.length > 0));
    assert.ok(calendars.some((calendar) => calendar.supportsEvents));
  },
);

test(
  "queryBusyCalItems returns bounded results",
  { skip: !runIntegration },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const items = await queryBusyCalItems(installation, {
      itemTypes: ["event", "task"],
      fetchLimit: 2,
    });

    assert.ok(items.length <= 2);
    for (const item of items) {
      assert.ok(item.id.length > 0);
      assert.ok(item.title !== undefined);
    }
  },
);

test(
  "queryBusyCalItems supports event-only and task-only combinations",
  { skip: !runIntegration },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const [eventItems, taskItems] = await Promise.all([
      queryBusyCalItems(installation, {
        itemTypes: ["event"],
        fetchLimit: 2,
      }),
      queryBusyCalItems(installation, {
        itemTypes: ["task"],
        fetchLimit: 2,
      }),
    ]);

    assert.ok(eventItems.length <= 2);
    assert.ok(taskItems.length <= 2);
    assert.ok(eventItems.every((item) => item.type === "event"));
    assert.ok(taskItems.every((item) => item.type === "task"));
  },
);

test(
  "findNextBusyCalAvailable returns either no slot or a valid ISO interval",
  { skip: !runIntegration },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const result = await findNextBusyCalAvailable(installation, {
      minimumDurationMinutes: 30,
      respectWorkingHours: true,
    });

    if (!result) {
      return;
    }

    assert.ok(!Number.isNaN(new Date(result.startDate).getTime()));
    assert.ok(!Number.isNaN(new Date(result.endDate).getTime()));
    assert.ok(
      new Date(result.endDate).getTime() >= new Date(result.startDate).getTime(),
    );
  },
);

test(
  "createBusyCalEvent and deleteBusyCalEvent round-trip a test event",
  {
    skip: !runIntegration || !runMutating,
    timeout: 30000,
  },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const { eventCalendarID } = await resolveMutatingCalendarIDs(installation);
    const uniqueTitle = `Raycast Integration Event ${Date.now()}`;
    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    const createdEvent = await createBusyCalEvent(installation, {
      title: uniqueTitle,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      calendarID: eventCalendarID,
      allDay: false,
      location: "Raycast Test Room",
      notes: "BusyCal Raycast integration test",
    });

    assert.equal(createdEvent.title, uniqueTitle);
    assert.equal(createdEvent.calendarID, eventCalendarID);
    assert.equal(createdEvent.location, "Raycast Test Room");

    const openedEvent = await openBusyCalAutomationItem(
      installation,
      createdEvent.id,
    );
    assert.equal(openedEvent.id, createdEvent.id);
    assert.equal(openedEvent.type, "event");

    const queriedItems = await pollForItems(installation, {
      searchText: uniqueTitle,
      startDate: new Date(startDate.getTime() - 60 * 60 * 1000).toISOString(),
      endDate: new Date(endDate.getTime() + 60 * 60 * 1000).toISOString(),
      itemTypes: ["event"],
      fetchLimit: 10,
    });

    assert.ok(queriedItems.some((item) => item.id === createdEvent.id));
    assert.ok(
      queriedItems.some(
        (item) =>
          item.id === createdEvent.id &&
          item.calendarID === eventCalendarID &&
          item.location === "Raycast Test Room",
      ),
    );
    await deleteBusyCalEvent(installation, createdEvent.id);

    const deletedItems = await queryBusyCalItems(installation, {
      searchText: uniqueTitle,
      startDate: new Date(startDate.getTime() - 60 * 60 * 1000).toISOString(),
      endDate: new Date(endDate.getTime() + 60 * 60 * 1000).toISOString(),
      itemTypes: ["event"],
      fetchLimit: 10,
    });

    assert.equal(deletedItems.some((item) => item.id === createdEvent.id), false);
  },
);

test(
  "createBusyCalTask and deleteBusyCalTask round-trip a test task",
  {
    skip: !runIntegration || !runMutating,
    timeout: 30000,
  },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const { taskCalendarID } = await resolveMutatingCalendarIDs(installation);
    const uniqueTitle = `Raycast Integration Task ${Date.now()}`;
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const createdTask = await createBusyCalTask(installation, {
      title: uniqueTitle,
      dueDate: dueDate.toISOString(),
      calendarID: taskCalendarID,
      notes: "BusyCal Raycast integration test",
    });

    assert.equal(createdTask.title, uniqueTitle);
    assert.equal(createdTask.calendarID, taskCalendarID);

    const openedTask = await openBusyCalAutomationItem(
      installation,
      createdTask.id,
    );
    assert.equal(openedTask.id, createdTask.id);
    assert.equal(openedTask.type, "task");

    const queriedItems = await pollForItems(installation, {
      searchText: uniqueTitle,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      endDate: new Date(dueDate.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      itemTypes: ["task"],
      fetchLimit: 10,
    });

    assert.ok(queriedItems.some((item) => item.id === createdTask.id));
    assert.ok(
      queriedItems.some(
        (item) =>
          item.id === createdTask.id &&
          item.calendarID === taskCalendarID,
      ),
    );
    await deleteBusyCalTask(installation, createdTask.id);

    const deletedItems = await queryBusyCalItems(installation, {
      searchText: uniqueTitle,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      endDate: new Date(dueDate.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      itemTypes: ["task"],
      fetchLimit: 10,
    });

    assert.equal(deletedItems.some((item) => item.id === createdTask.id), false);
  },
);

test(
  "createBusyCalTask round-trips an undated task through query and open",
  {
    skip: !runIntegration || !runMutating,
    timeout: 30000,
  },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const { taskCalendarID } = await resolveMutatingCalendarIDs(installation);
    const uniqueTitle = `Raycast Undated Task ${Date.now()}`;

    const createdTask = await createBusyCalTask(installation, {
      title: uniqueTitle,
      calendarID: taskCalendarID,
      notes: "BusyCal Raycast undated task integration test",
    });

    assert.equal(createdTask.title, uniqueTitle);
    assert.equal(createdTask.calendarID, taskCalendarID);
    assert.equal(createdTask.dueDate, undefined);

    const queriedItems = await pollForItems(installation, {
      searchText: uniqueTitle,
      itemTypes: ["task"],
      fetchLimit: 10,
    });
    const queriedTask = queriedItems.find((item) => item.id === createdTask.id);

    assert.ok(queriedTask, "Expected undated task to be queryable by its returned ID.");
    assert.equal(queriedTask?.dueDate, undefined);

    const openedTask = await openBusyCalAutomationItem(
      installation,
      createdTask.id,
    );
    assert.equal(openedTask.id, createdTask.id);
    assert.equal(openedTask.type, "task");

    await deleteBusyCalTask(installation, createdTask.id);

    const deletedItems = await queryBusyCalItems(installation, {
      searchText: uniqueTitle,
      itemTypes: ["task"],
      fetchLimit: 10,
    });

    assert.equal(deletedItems.some((item) => item.id === createdTask.id), false);
  },
);

test(
  "createBusyCalNaturalLanguageItem round-trips a quick-add event",
  {
    skip: !runIntegration || !runMutating,
    timeout: 30000,
  },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const uniqueTitle = `Raycast Quick Event ${Date.now()}`;

    const createdEvent = await createBusyCalNaturalLanguageItem(installation, {
      text: `${uniqueTitle} tomorrow at 2pm`,
      itemType: "event",
    });

    assert.equal(createdEvent.type, "event");
    assert.equal(createdEvent.title, uniqueTitle);

    const openedEvent = await openBusyCalAutomationItem(
      installation,
      createdEvent.id,
    );
    assert.equal(openedEvent.id, createdEvent.id);

    const queriedItems = await pollForItems(installation, {
      searchText: uniqueTitle,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      itemTypes: ["event"],
      fetchLimit: 10,
    });

    assert.ok(queriedItems.some((item) => item.id === createdEvent.id));
    await deleteBusyCalEvent(installation, createdEvent.id);
  },
);

test(
  "createBusyCalNaturalLanguageItem round-trips a quick-add task",
  {
    skip: !runIntegration || !runMutating,
    timeout: 30000,
  },
  async () => {
    const installation = await resolveBusyCalInstallation();
    const uniqueTitle = `Raycast Quick Task ${Date.now()}`;

    const createdTask = await createBusyCalNaturalLanguageItem(installation, {
      text: `${uniqueTitle} tomorrow at 2pm`,
      itemType: "task",
    });

    assert.equal(createdTask.type, "task");
    assert.equal(createdTask.title, uniqueTitle);

    const openedTask = await openBusyCalAutomationItem(
      installation,
      createdTask.id,
    );
    assert.equal(openedTask.id, createdTask.id);

    const queriedItems = await pollForItems(installation, {
      searchText: uniqueTitle,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      itemTypes: ["task"],
      fetchLimit: 10,
    });

    assert.ok(queriedItems.some((item) => item.id === createdTask.id));
    await deleteBusyCalTask(installation, createdTask.id);
  },
);

async function pollForItems(
  installation: Awaited<ReturnType<typeof resolveBusyCalInstallation>>,
  query: Parameters<typeof queryBusyCalItems>[1],
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const items = await queryBusyCalItems(installation, query);
    if (items.length > 0) {
      return items;
    }

    await delay(500);
  }

  return [];
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function normalizedEnvValue(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

async function resolveMutatingCalendarIDs(
  installation: Awaited<ReturnType<typeof resolveBusyCalInstallation>>,
): Promise<{ eventCalendarID: string; taskCalendarID: string }> {
  if (configuredEventTestCalendarID && configuredTaskTestCalendarID) {
    return {
      eventCalendarID: configuredEventTestCalendarID,
      taskCalendarID: configuredTaskTestCalendarID,
    };
  }

  const calendars = await listBusyCalCalendars(installation);
  const preferredEventCalendar =
    calendars.find((calendar) => calendar.supportsEvents && !calendar.isSubscribed) ??
    calendars.find((calendar) => calendar.supportsEvents);
  const preferredTaskCalendar =
    calendars.find((calendar) => calendar.supportsTasks && !calendar.isSubscribed) ??
    calendars.find((calendar) => calendar.supportsTasks);

  assert.ok(preferredEventCalendar, "No BusyCal event calendar available for mutation tests.");
  assert.ok(preferredTaskCalendar, "No BusyCal task calendar available for mutation tests.");

  return {
    eventCalendarID:
      configuredEventTestCalendarID ?? preferredEventCalendar.calendarID,
    taskCalendarID:
      configuredTaskTestCalendarID ?? preferredTaskCalendar.calendarID,
  };
}
