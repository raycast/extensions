import { describe, expect, it } from "vitest";
import { MenuBarExtra, mocks } from "../test/raycast-api";
import { useCachedPromiseFixtures } from "../test/raycast-utils";
import { flush, render } from "../test/render";
import { listOutdated, parseOutdated } from "./mise/outdated";
import outdatedFixture from "./mise/fixtures/outdated.json";
import Command from "./outdated-tools";

describe("Tools Menu Bar", () => {
  it("shows the count and hands each tool to Show Outdated Tools", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    const { root } = await render(<Command />);
    const menu = root.findByType(MenuBarExtra);
    expect(menu.props).toMatchObject({ title: "4", tooltip: "mise: 4 outdated tools" });

    const gh = menu.findAllByType(MenuBarExtra.Item).find((n) => n.props.title === "gh");
    expect(gh?.props.subtitle).toBe("2.100.0 → 2.101.0");
    await flush(() => gh?.props.onAction());
    expect(mocks.launchCommand).toHaveBeenCalledWith({
      name: "show-outdated",
      type: "userInitiated",
      context: { upgrade: "gh" },
    });
  });

  it("offers the extension preferences when the configured mise path does not exist", async () => {
    mocks.getPreferenceValues.mockReturnValue({ misePath: "/nonexistent/mise" });
    const { root } = await render(<Command />);
    const item = root.findByType(MenuBarExtra.Item);
    expect(item.props.title).toBe("mise not found");
    expect(item.props.onAction).toBe(mocks.openExtensionPreferences);
  });
});
