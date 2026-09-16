import assert from "node:assert/strict";
import test from "node:test";

import type { Destination } from "../src/domain/destination";
import { type DestinationLibraryDependencies, persistDestinationLibrary } from "../src/domain/destination-persistence";

const previousDestination: Destination = {
  id: "previous",
  name: "Previous",
  path: "/Previous",
  keywords: [],
  copy: true,
  move: true,
  pinned: false,
};

const nextDestination: Destination = {
  id: "next",
  name: "Next",
  path: "/Next",
  keywords: [],
  copy: true,
  move: true,
  pinned: false,
};

test("destination persistence writes LocalStorage before committing the CSV", async () => {
  const events: string[] = [];
  const dependencies: DestinationLibraryDependencies = {
    getDestinations: async () => {
      events.push("load previous");
      return [previousDestination];
    },
    saveDestinations: async (destinations) => {
      events.push(`save ${destinations[0]?.id ?? "empty"}`);
    },
    writeDestinationsToCsv: async (_configuredCsvFile, destinations) => {
      events.push(`write ${destinations[0]?.id ?? "empty"}`);
      return "/destinations.csv";
    },
  };

  const csvFile = await persistDestinationLibrary([nextDestination], undefined, dependencies);

  assert.equal(csvFile, "/destinations.csv");
  assert.deepEqual(events, ["load previous", "save next", "write next"]);
});

test("a CSV failure restores the previous LocalStorage destination library", async () => {
  const savedIds: string[] = [];
  const dependencies: DestinationLibraryDependencies = {
    getDestinations: async () => [previousDestination],
    saveDestinations: async (destinations) => {
      savedIds.push(destinations[0]?.id ?? "empty");
    },
    writeDestinationsToCsv: async () => {
      throw new Error("simulated CSV failure");
    },
  };

  await assert.rejects(persistDestinationLibrary([nextDestination], undefined, dependencies), /simulated CSV failure/);
  assert.deepEqual(savedIds, ["next", "previous"]);
});

test("a LocalStorage failure leaves the CSV untouched", async () => {
  let csvWriteAttempted = false;
  const dependencies: DestinationLibraryDependencies = {
    getDestinations: async () => [previousDestination],
    saveDestinations: async () => {
      throw new Error("simulated LocalStorage failure");
    },
    writeDestinationsToCsv: async () => {
      csvWriteAttempted = true;
      return "/destinations.csv";
    },
  };

  await assert.rejects(
    persistDestinationLibrary([nextDestination], undefined, dependencies),
    /simulated LocalStorage failure/,
  );
  assert.equal(csvWriteAttempted, false);
});

test("a failed rollback reports both the CSV and rollback failures", async () => {
  let saveAttempt = 0;
  const dependencies: DestinationLibraryDependencies = {
    getDestinations: async () => [previousDestination],
    saveDestinations: async () => {
      saveAttempt += 1;
      if (saveAttempt === 2) {
        throw new Error("simulated rollback failure");
      }
    },
    writeDestinationsToCsv: async () => {
      throw new Error("simulated CSV failure");
    },
  };

  await assert.rejects(
    persistDestinationLibrary([nextDestination], undefined, dependencies),
    (error: unknown) =>
      error instanceof AggregateError &&
      error.errors.some((item) => item instanceof Error && item.message === "simulated CSV failure") &&
      error.errors.some((item) => item instanceof Error && item.message === "simulated rollback failure"),
  );
});
