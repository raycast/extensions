import { expect, test } from "vitest";
import { commandGroups, actionsWithMissingIcons, actions } from "./rectangle-pro";
import { actions as rectangleActions } from "./rectangle";
import { readdirSync } from "fs";

test("All actions with icons are supported", () => {
  const supportedActions = new Set(
    Object.values(commandGroups)
      .map((group) => group.items)
      .flat()
      .map((item) => item.name),
  );

  const missingIcons = new Set(
    Object.values(actionsWithMissingIcons)
      .map((group) => group.items)
      .flat()
      .map((item) => item.name),
  );

  const allActionsExceptThoseMissingIcons = new Set(actions.filter((action) => !missingIcons.has(action)));

  // `fullscreen` is not working as of 7/12/2024 (see Rectangle Pro discussion: https://github.com/rxhanson/RectanglePro-Community/issues/463),
  // so the corresponding action has been commented out in src/actions/rectangle-pro.ts
  allActionsExceptThoseMissingIcons.delete("fullscreen");

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

test("All expected icons used", () => {
  // gather all icon filenames from assets/window-positions
  const iconFiles = new Set();
  for (const file of readdirSync("./assets/window-positions")) {
    if (!file.endsWith("@dark.png")) {
      iconFiles.add(file);
    }
  }

  // gather all icon filenames from actions
  const referencedIcons = Object.values(commandGroups)
    .map((group) => group.items)
    .flat()
    .map((item) => item.icon.replace("window-positions/", ""));

  const knownUnusedIcons = [
    "dragTemplate.png",
    "emptyReticleTemplate.png",
    "tidyTemplate.png",
    "nextSpaceTemplate.png", // larger icon used instead
    "prevSpaceTemplate.png", // larger icon used instead
    "resizeTemplate.png",
    "restore2Template.png",
    "reticleTemplate.png",
  ];

  expect(new Set([...referencedIcons, ...knownUnusedIcons])).toEqual(iconFiles);
});

test("all rectangle actions are supported when using rectangle pro", () => {
  // these actions are known to be unsupported by rectangle pro
  const knownMissingActions = new Set(["specified", "tile-all", "reverse-all"]);

  // cascade app differs between rectangle / rectangle pro; the "cascade-active-app" action is expected
  // to be unsupported by rectangle pro as the equivalent supported action would be "cascade-app"
  knownMissingActions.add("cascade-active-app");

  const detectedMissingActions = new Set<string>();

  const proActions = new Set<string>(actions);

  for (const action of rectangleActions) {
    if (!proActions.has(action)) {
      detectedMissingActions.add(action);
    }
  }

  expect(detectedMissingActions).toEqual(knownMissingActions);
});
