import { expect, test } from "vitest";
import { commandGroups, actionsWithMissingIcons, actions } from "./rectangle";

test("All actions with icons are supported", () => {
  const supportedActions = new Set(
    Object.values(commandGroups)
      .map((group) => group.items)
      .flat()
      .map((item) => item.name),
  );

  const missingIcons = new Set(actionsWithMissingIcons);

  const allActionsExceptThoseMissingIcons = new Set(actions.filter((action) => !missingIcons.has(action)));

  expect(supportedActions).toEqual(allActionsExceptThoseMissingIcons);
});

test("All actions are unique", () => {
  const supportedActions = Object.values(commandGroups)
    .map((group) => group.items)
    .flat()
    .map((item) => item.name);

  const counts = new Map();

  for (const action of supportedActions) {
    if (counts.has(action)) {
      counts.set(action, counts.get(action)! + 1);
    } else {
      counts.set(action, 1);
    }
  }

  // filter to actions which occur more than once
  const nonUnique = Array.from(counts)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, count]) => count > 1);

  expect(nonUnique).toEqual([]);
});
