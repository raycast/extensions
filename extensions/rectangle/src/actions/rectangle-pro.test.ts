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

  const detectedMissingActions = new Set<string>();

  const proActions = new Set<string>(actions);

  for (const action of rectangleActions) {
    if (!proActions.has(action)) {
      detectedMissingActions.add(action);
    }
  }

  expect(detectedMissingActions).toEqual(knownMissingActions);
});

// test("All large icons used", () => {
//   // gather all icon filenames from assets/window-positions
//   const iconFiles = new Set();

//   const allIconFileNamesRaw = `almostMaximizeLarge.png
// almostMaximizeTemplate.png
// blCornerTwoThirdsTemplate.png
// blEighthTemplate.png
// blNinthTemplate.png
// bNinthTemplate.png
// bottomCenterSixthTemplate.png
// bottomHalfTemplate.png
// bottomLeftLargeTemplate.png
// bottomLeftSixthTemplate.png
// bottomLeftTemplate.png
// bottomRightLargeTemplate.png
// bottomRightSixthTemplate.png
// bottomRightTemplate.png
// brCornerTwoThirdsTemplate.png
// brEighthTemplate.png
// brNinthTemplate.png
// cblEighthTemplate.png
// cbrEighthTemplate.png
// centerLeftFourthTemplate.png
// centerRightFourthTemplate.png
// centerTemplate.png
// centerThirdTemplate.png
// centerTwoThirdsTemplate.png
// cNinthTemplate.png
// ctlEighthTemplate.png
// ctrEighthTemplate.png
// cycleStashedTemplate.png
// dragTemplate.png
// dragTemplate copy.png
// emptyReticleTemplate.png
// fillCornersBLTemplate.png
// fillCornersBRTemplate.png
// fillCornersTLTemplate.png
// fillCornersTRTemplate.png
// fillLeftTemplate.png
// fillRightTemplate.png
// firstThirdTemplate.png
// firstThreeFourthsTemplate.png
// firstTwoThirdsTemplate.png
// halfWidthCenterTemplate.png
// hideoutBottomTemplate.png
// hideoutLeftTemplate.png
// hideoutRightTemplate.png
// large_almostMaximizeTemplate.png
// large_appToolbarTemplate.png
// large_blCornerTwoThirdsTemplate.png
// large_blEighthTemplate.png
// large_blNinthTemplate.png
// large_bNinthTemplate.png
// large_bottomCenterSixthTemplate.png
// large_bottomHalfTemplate.png
// large_bottomLeftSixthTemplate.png
// large_bottomLeftTemplate.png
// large_bottomRightSixthTemplate.png
// large_bottomRightTemplate.png
// large_brCornerTwoThirdsTemplate.png
// large_brEighthTemplate.png
// large_brNinthTemplate.png
// large_cblEighthTemplate.png
// large_cbrEighthTemplate.png
// large_centerLeftFourthTemplate.png
// large_centerRightFourthTemplate.png
// large_centerTemplate.png
// large_centerThirdTemplate.png
// large_centerTwoThirdsTemplate.png
// large_cNinthTemplate.png
// large_ctlEighthTemplate.png
// large_ctrEighthTemplate.png
// large_cycleStashedTemplate.png
// large_fillCornersBLLargeTemplate.png
// large_fillCornersBRLargeTemplate.png
// large_fillCornersTLLargeTemplate.png
// large_fillCornersTRLargeTemplate.png
// large_fillLeftTemplate.png
// large_fillRightTemplate.png
// large_firstThirdTemplate.png
// large_firstThreeFourthsTemplate.png
// large_firstTwoThirdsTemplate.png
// large_halfWidthCenterTemplate.png
// large_hideoutBottomTemplate.png
// large_hideoutLeftTemplate.png
// large_hideoutRightTemplate.png
// large_largerTemplate.png
// large_lastThirdTemplate.png
// large_lastThreeFourthsTemplate.png
// large_lastTwoThirdsTemplate.png
// large_leftFourthTemplate.png
// large_leftHalfTemplate.png
// large_leftSixthTemplate.png
// large_lNinthTemplate.png
// large_maximizeHeightTemplate.png
// large_maximizeTemplate.png
// large_moveDownTemplate.png
// large_moveLeftTemplate.png
// large_moveRightTemplate.png
// large_moveUpTemplate.png
// large_nextDisplayCenterTemplate.png
// large_nextDisplayTemplate.png
// large_nextSpaceTemplate.png
// large_nudgeDownTemplate.png
// large_nudgeLeftTemplate.png
// large_nudgeRightTemplate.png
// large_nudgeUpTemplate.png
// large_prevDisplayCenterTemplate.png
// large_prevDisplayTemplate.png
// large_prevSpaceTemplate.png
// large_restore2Template.png
// large_restoreTemplate.png
// large_rightFourthTemplate.png
// large_rightHalfTemplate.png
// large_rightSixthTemplate.png
// large_rNinthTemplate.png
// large_smallerTemplate.png
// large_snapBottomLeftTemplate.png
// large_snapBottomRightTemplate.png
// large_snapTopLeftTemplate.png
// large_snapTopRightTemplate.png
// large_specCharmTemplate.png
// large_stashAllButFront.png
// large_stashAllTemplate.png
// large_stashUpTemplate.png
// large_tidyTemplate.png
// large_tlCornerTwoThirdsTemplate.png
// large_tlEighthTemplate.png
// large_tlNinthTemplate.png
// large_tNinthTemplate.png
// large_toggleTuckedTemplate.png
// large_topCenterSixthTemplate.png
// large_topHalfTemplate.png
// large_topLeftSixthTemplate.png
// large_topLeftTemplate.png
// large_topRightSixthTemplate.png
// large_topRightTemplate.png
// large_trCornerTwoThirdsTemplate.png
// large_trEighthTemplate.png
// large_trNinthTemplate.png
// large_untuckAllTemplate.png
// large_upperCenterTemplate.png
// lastThirdTemplate.png
// lastThreeFourthsTemplate.png
// lastTwoThirdsTemplate.png
// leftFourthTemplate.png
// leftHalfLargeTemplate.png
// leftHalfTemplate.png
// leftSixthTemplate.png
// lNinthTemplate.png
// makeLargerTemplate.png
// makeSmallerTemplate.png
// maximizeHeightTemplate.png
// maximizeLargeTemplate.png
// maximizeTemplate.png
// moveDownTemplate.png
// moveLeftTemplate.png
// moveRightTemplate.png
// moveSpaceLeftLargerTemplate.png
// moveSpaceRightLargerTemplate.png
// moveUpTemplate.png
// nextDisplayCenterTemplate.png
// nextDisplayTemplate.png
// nextSpaceTemplate.png
// nudgeDownTemplate.png
// nudgeLeftTemplate.png
// nudgeRightTemplate.png
// nudgeUpTemplate.png
// prevDisplayCenterTemplate.png
// prevDisplayTemplate.png
// prevSpaceTemplate.png
// resizeTemplate.png
// resizeTemplate copy.png
// restore2Template.png
// restoreTemplate.png
// reticleTemplate.png
// rightFourthTemplate.png
// rightHalfLargeTemplate.png
// rightHalfTemplate.png
// rightSixthTemplate.png
// rNinthTemplate.png
// snapBottomLeftTemplate.png
// snapBottomRightTemplate.png
// snapTopLeftTemplate.png
// snapTopRightTemplate.png
// stashAllButFront.png
// stashAllTemplate.png
// stashUpTemplate.png
// tidyTemplate.png
// tlCornerTwoThirdsTemplate.png
// tlEighthTemplate.png
// tlNinthTemplate.png
// tNinthTemplate.png
// toggleTuckedTemplate.png
// topCenterSixthTemplate.png
// topHalfTemplate.png
// topLeftLargeTemplate.png
// topLeftSixthTemplate.png
// topLeftTemplate.png
// topRightLargeTemplate.png
// topRightSixthTemplate.png
// topRightTemplate.png
// trCornerTwoThirdsTemplate.png
// trEighthTemplate.png
// trNinthTemplate.png
// untuckAllTemplate.png
// upperCenterTemplate.png
// `;

//   for (const file of allIconFileNamesRaw.split("\n")) {
//     iconFiles.add(file);
//   }

//   // gather all icon filenames from actions
//   const referencedIcons = Object.values(commandGroups)
//     .map((group) => group.items)
//     .flat()
//     .map((item) => item.icon.replace("window-positions/", ""));

//   expect(new Set(referencedIcons)).toEqual(iconFiles);
// });
