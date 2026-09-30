import { describe, expect, it } from "vitest";
import { canToggleSpaceEnabled, shouldShowSpaceIdTutorial } from "./manageSpaces";

describe("manageSpaces helpers", () => {
  it("shows the tutorial only on first run when spaces exist", () => {
    expect(shouldShowSpaceIdTutorial({ hasSeenTutorial: false, spacesCount: 1 })).toBe(true);
    expect(shouldShowSpaceIdTutorial({ hasSeenTutorial: true, spacesCount: 1 })).toBe(false);
    expect(shouldShowSpaceIdTutorial({ hasSeenTutorial: false, spacesCount: 0 })).toBe(false);
  });

  it("prevents disabling the enabled primary space", () => {
    expect(
      canToggleSpaceEnabled({
        space: {
          path: "/tmp/space.sqlite",
          spaceID: "space-1",
          primary: true,
          customName: null,
          isEnabled: true,
        },
        currentlyEnabled: true,
      }),
    ).toBe(false);

    expect(
      canToggleSpaceEnabled({
        space: {
          path: "/tmp/space.sqlite",
          spaceID: "space-1",
          primary: true,
          customName: null,
          isEnabled: false,
        },
        currentlyEnabled: false,
      }),
    ).toBe(true);
  });
});
