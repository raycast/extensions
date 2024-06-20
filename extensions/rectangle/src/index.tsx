import {
  open,
  captureException,
  showToast,
  Toast,
  Action,
  getFrontmostApplication,
  closeMainWindow,
  Grid,
  ActionPanel,
} from "@raycast/api";
import { ensureRectangleIsInstalled } from "./utils/checkInstall";

// source of truth, taken from https://github.com/rxhanson/Rectangle?tab=readme-ov-file#execute-an-action-by-url
const actions = [
  "left-half",
  "right-half",
  "center-half",
  "top-half",
  "bottom-half",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "first-third",
  "center-third",
  "last-third",
  "first-two-thirds",
  "last-two-thirds",
  "maximize",
  "almost-maximize",
  "maximize-height",
  "smaller",
  "larger",
  "center",
  "restore",
  "next-display",
  "previous-display",
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "first-fourth",
  "second-fourth",
  "third-fourth",
  "last-fourth",
  "first-three-fourths",
  "last-three-fourths",
  "top-left-sixth",
  "top-center-sixth",
  "top-right-sixth",
  "bottom-left-sixth",
  "bottom-center-sixth",
  "bottom-right-sixth",
  "specified",
  "reverse-all",
  "top-left-ninth",
  "top-center-ninth",
  "top-right-ninth",
  "middle-left-ninth",
  "middle-center-ninth",
  "middle-right-ninth",
  "bottom-left-ninth",
  "bottom-center-ninth",
  "bottom-right-ninth",
  "top-left-third",
  "top-right-third",
  "bottom-left-third",
  "bottom-right-third",
  "top-left-eighth",
  "top-center-left-eighth",
  "top-center-right-eighth",
  "top-right-eighth",
  "bottom-left-eighth",
  "bottom-center-left-eighth",
  "bottom-center-right-eighth",
  "bottom-right-eighth",
  "tile-all",
  "cascade-all",
] as const;

type RectangleAction = (typeof actions)[number];

const commandGroups = {
  halves: {
    title: "Halves",
    items: [
      {
        name: "left-half",
        title: "Left Half",
        icon: "window-positions/leftHalfTemplate.png",
        description: "Move the focused window to the left half of the current display",
        mode: "no-view",
      },
      {
        name: "right-half",
        title: "Right Half",
        icon: "window-positions/rightHalfTemplate.png",
        description: "Move the focused window to the right half of the current display",
        mode: "no-view",
      },
      {
        name: "center-half",
        title: "Half Width Center",
        icon: "window-positions/halfWidthCenterTemplate.png",
        description: "Center the focused window at half width of the current display",
        mode: "no-view",
      },
      {
        name: "top-half",
        title: "Top Half",
        icon: "window-positions/topHalfTemplate.png",
        description: "Move the focused window to the top half of the current display",
        mode: "no-view",
      },
      {
        name: "bottom-half",
        title: "Bottom Half",
        icon: "window-positions/bottomHalfTemplate.png",
        description: "Move the focused window to the bottom half of the current display",
        mode: "no-view",
      },
    ],
  },
  thirds: {
    title: "Thirds",
    items: [
      {
        name: "first-third",
        title: "First Third",
        icon: "window-positions/firstThirdTemplate.png",
        description: "Move the focused window to the first third of the current display",
        mode: "no-view",
      },
      {
        name: "last-third",
        title: "Last Third",
        icon: "window-positions/lastThirdTemplate.png",
        description: "Move the focused window to the last third of the current display",
        mode: "no-view",
      },
      {
        name: "first-two-thirds",
        title: "First Two Thirds",
        icon: "window-positions/firstTwoThirdsTemplate.png",
        description: "Move the focused window to occupy the first two thirds of the current display",
        mode: "no-view",
      },
      {
        name: "center-third",
        title: "Center Third",
        icon: "window-positions/centerThirdTemplate.png",
        description: "Move the focused window to the center third of the current display",
        mode: "no-view",
      },
      {
        name: "last-two-thirds",
        title: "Last Two Thirds",
        icon: "window-positions/lastTwoThirdsTemplate.png",
        description: "Move the focused window to occupy the last two thirds of the current display",
        mode: "no-view",
      },
    ],
  },
  fourths: {
    title: "Fourths",
    items: [
      {
        name: "first-fourth",
        title: "First Fourth",
        icon: "window-positions/leftFourthTemplate.png",
        description: "Move the focused window to the first fourth of the current display",
        mode: "no-view",
      },
      {
        name: "second-fourth",
        title: "Second Fourth",
        icon: "window-positions/centerLeftFourthTemplate.png",
        description: "Move the focused window to the second fourth of the current display",
        mode: "no-view",
      },
      {
        name: "third-fourth",
        title: "Third Fourth",
        icon: "window-positions/centerRightFourthTemplate.png",
        description: "Move the focused window to the third fourth of the current display",
        mode: "no-view",
      },
      {
        name: "last-fourth",
        title: "Last Fourth",
        icon: "window-positions/rightFourthTemplate.png",
        description: "Move the focused window to the last fourth of the current display",
        mode: "no-view",
      },
      {
        name: "first-three-fourths",
        title: "First Three Fourths",
        icon: "window-positions/firstThreeFourthsTemplate.png",
        description: "Move the focused window to occupy the first three fourths of the current display",
        mode: "no-view",
      },
      {
        name: "last-three-fourths",
        title: "Last Three Fourths",
        icon: "window-positions/lastThreeFourthsTemplate.png",
        description: "Move the focused window to occupy the last three fourths of the current display",
        mode: "no-view",
      },
    ],
  },
  sixths: {
    title: "Sixths",
    items: [
      {
        name: "top-left-sixth",
        title: "Top Left Sixth",
        icon: "window-positions/topLeftSixthTemplate.png",
        description: "Move the focused window to the top left sixth of the current display",
        mode: "no-view",
      },
      {
        name: "top-center-sixth",
        title: "Top Center Sixth",
        icon: "window-positions/topCenterSixthTemplate.png",
        description: "Move the focused window to the top center sixth of the current display",
        mode: "no-view",
      },
      {
        name: "top-right-sixth",
        title: "Top Right Sixth",
        icon: "window-positions/topRightSixthTemplate.png",
        description: "Move the focused window to the top right sixth of the current display",
        mode: "no-view",
      },
      {
        name: "bottom-left-sixth",
        title: "Bottom Left Sixth",
        icon: "window-positions/bottomLeftSixthTemplate.png",
        description: "Move the focused window to the bottom left sixth of the current display",
        mode: "no-view",
      },
      {
        name: "bottom-center-sixth",
        title: "Bottom Center Sixth",
        icon: "window-positions/bottomCenterSixthTemplate.png",
        description: "Move the focused window to the bottom center sixth of the current display",
        mode: "no-view",
      },
      {
        name: "bottom-right-sixth",
        title: "Bottom Right Sixth",
        icon: "window-positions/bottomRightSixthTemplate.png",
        description: "Move the focused window to the bottom right sixth of the current display",
        mode: "no-view",
      },
    ],
  },
  other: {
    title: "Other",
    items: [
      {
        name: "maximize",
        title: "Maximize",
        icon: "window-positions/maximizeTemplate.png",
        description: "Maximize the focused window",
        mode: "no-view",
      },
      {
        name: "almost-maximize",
        title: "Almost Maximize",
        icon: "window-positions/almostMaximizeTemplate.png",
        description: "Almost maximize the focused window",
        mode: "no-view",
      },
      {
        name: "bottom-left",
        title: "Bottom Left",
        icon: "window-positions/bottomLeftTemplate.png",
        description: "Move the focused window to the bottom left of the current display",
        mode: "no-view",
      },
      {
        name: "bottom-right",
        title: "Bottom Right",
        icon: "window-positions/bottomRightTemplate.png",
        description: "Move the focused window to the bottom right of the current display",
        mode: "no-view",
      },
      {
        name: "center",
        title: "Center",
        icon: "window-positions/centerTemplate.png",
        description: "Center the focused window on the current display",
        mode: "no-view",
      },
      {
        name: "larger",
        title: "Make Larger",
        icon: "window-positions/makeLargerTemplate.png",
        description: "Increase the size of the focused window",
        mode: "no-view",
      },
      {
        name: "smaller",
        title: "Make Smaller",
        icon: "window-positions/makeSmallerTemplate.png",
        description: "Decrease the size of the focused window",
        mode: "no-view",
      },
      {
        name: "maximize-height",
        title: "Maximize Height",
        icon: "window-positions/maximizeHeightTemplate.png",
        description: "Maximize the height of the focused window",
        mode: "no-view",
      },
      {
        name: "move-down",
        title: "Move Down",
        icon: "window-positions/moveDownTemplate.png",
        description: "Move the focused window down",
        mode: "no-view",
      },
      {
        name: "move-left",
        title: "Move Left",
        icon: "window-positions/moveLeftTemplate.png",
        description: "Move the focused window to the left",
        mode: "no-view",
      },
      {
        name: "move-right",
        title: "Move Right",
        icon: "window-positions/moveRightTemplate.png",
        description: "Move the focused window to the right",
        mode: "no-view",
      },
      {
        name: "move-up",
        title: "Move Up",
        icon: "window-positions/moveUpTemplate.png",
        description: "Move the focused window up",
        mode: "no-view",
      },
      {
        name: "next-display",
        title: "Next Display",
        icon: "window-positions/nextDisplayTemplate.png",
        description: "Move the focused window to the next display",
        mode: "no-view",
      },
      {
        name: "previous-display",
        title: "Previous Display",
        icon: "window-positions/prevDisplayTemplate.png",
        description: "Move the focused window to the previous display",
        mode: "no-view",
      },
      {
        name: "restore",
        title: "Restore",
        icon: "window-positions/restoreTemplate.png",
        description: "Restore the focused window to its original size and position",
        mode: "no-view",
      },
      {
        name: "top-left",
        title: "Top Left",
        icon: "window-positions/topLeftTemplate.png",
        description: "Move the focused window to the top left of the current display",
        mode: "no-view",
      },
      {
        name: "top-right",
        title: "Top Right",
        icon: "window-positions/topRightTemplate.png",
        description: "Move the focused window to the top right of the current display",
        mode: "no-view",
      },
    ],
  },
} as const;

// The following commands did not have an icon template, so they've been omitted for now:
// 'specified',
// 'reverse-all',
// 'top-left-ninth',
// 'top-center-ninth',
// 'top-right-ninth',
// 'middle-left-ninth',
// 'middle-center-ninth',
// 'middle-right-ninth',
// 'bottom-left-ninth',
// 'bottom-center-ninth',
// 'bottom-right-ninth',
// 'top-left-third',
// 'top-right-third',
// 'bottom-left-third',
// 'bottom-right-third',
// 'top-left-eighth',
// 'top-center-left-eighth',
// 'top-center-right-eighth',
// 'top-right-eighth',
// 'bottom-left-eighth',
// 'bottom-center-left-eighth',
// 'bottom-center-right-eighth',
// 'bottom-right-eighth',
// 'tile-all',
// 'cascade-all'

// Once all commands have been implemented, the compiler can ensure none are missing
// by uncommenting the following lines:

// const allGroupedCommands = [
//   ...commandGroups.halves.items.map(({ name }) => name),
//   ...commandGroups.thirds.items.map(({ name }) => name),
//   ...commandGroups.fourths.items.map(({ name }) => name),
//   ...commandGroups.sixths.items.map(({ name }) => name),
//   ...commandGroups.other.items.map(({ name }) => name),
// ] as const satisfies typeof actions;

export default function Command() {
  ensureRectangleIsInstalled();

  return (
    <Grid inset={Grid.Inset.Medium} searchBarPlaceholder="Find a Rectangle action">
      {Object.values(commandGroups).map((group) => (
        <Grid.Section title={group.title} key={group.title}>
          {group.items.map(({ name, title, icon, description }) => (
            <Grid.Item
              key={name}
              content={{
                value: {
                  source: {
                    light: icon,
                    dark: icon.replace(".png", "@dark.png"),
                  },
                },
                tooltip: description,
              }}
              title={title}
              subtitle={description}
              actions={
                <ActionPanel>
                  <Action title={`Execute ${title}`} onAction={() => buildCommand(name)()} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

export const buildCommand = (action: RectangleAction) => async () => {
  const url = `rectangle://execute-action?name=${action}`;

  const isRectangleInstalled = await ensureRectangleIsInstalled();

  // bail out early if Rectangle is not found
  if (!isRectangleInstalled) {
    return;
  }

  try {
    await getFrontmostApplication();
  } catch (e: unknown) {
    captureException(e);
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to run action "${action}: unable to obtain focused window"`,
    });
    return;
  }

  await closeMainWindow();

  try {
    await open(url);
  } catch (e: unknown) {
    captureException(e);
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to run action "${action}"`,
    });
  }
};
