import { LaunchType, type LaunchProps } from "@raycast/api";
import { describe, expect, it } from "vitest";
import { Action, Detail, List, mocks } from "../test/raycast-api";
import { useCachedPromiseFixtures } from "../test/raycast-utils";
import { flush, render } from "../test/render";
import { listOutdated, parseOutdated } from "./mise/outdated";
import outdatedFixture from "./mise/fixtures/outdated.json";
import inactiveFixture from "./mise/fixtures/outdated-inactive.json";
import Command from "./show-outdated";

const launch: LaunchProps = { arguments: {}, launchType: LaunchType.UserInitiated };

describe("Show Outdated Tools", () => {
  it("lists each outdated tool as current → latest and writes the count as the command subtitle", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    const { root } = await render(<Command {...launch} />);
    const items = root.findAllByType(List.Item);

    expect(items.map((n) => [n.props.title, n.props.subtitle])).toEqual([
      ["gh", "2.100.0 → 2.101.0"],
      ["npm:wrangler", "4.131.1 → 4.131.2"],
      ["opencode", "1.18.30 → 1.18.31"],
      ["usage", "6.9.0 → 6.9.1"],
    ]);
    expect(items[0].props.accessories).toEqual([{ tag: "config.local.toml" }]);
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "4 outdated" });
  });

  it("reports All up to date when nothing is outdated", async () => {
    useCachedPromiseFixtures.set(listOutdated, []);
    const { root } = await render(<Command {...launch} />);
    expect(root.findAllByType(List.Item)).toEqual([]);
    expect(root.findByType(List.EmptyView).props.title).toBe("All tools up to date");
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "All up to date" });
  });

  it("shows the requested version only when it is pinned, and nothing for an inactive install", async () => {
    const [gh] = parseOutdated(outdatedFixture);
    const [inactive] = parseOutdated(inactiveFixture);
    useCachedPromiseFixtures.set(listOutdated, [gh, { ...gh, name: "node", requested: "lts" }, inactive]);
    const { root } = await render(<Command {...launch} />);
    const [latest, pinned, unconfigured] = root.findAllByType(List.Item);

    expect(latest.props.accessories).toEqual([{ tag: "config.local.toml" }]);
    expect(pinned.props.accessories).toEqual([
      { text: "lts", tooltip: "Requested version" },
      { tag: "config.local.toml" },
    ]);
    expect(unconfigured.props).toMatchObject({ subtitle: "2.99.0 → 2.101.0", accessories: [] });
  });

  it("shows the error with a Retry that refetches when mise outdated fails", async () => {
    useCachedPromiseFixtures.fail(listOutdated, new Error("boom"));
    const { root } = await render(<Command {...launch} />);

    const empty = root.findByType(List.EmptyView);
    expect(empty.props).toMatchObject({ title: "Couldn't load from mise", description: "boom" });
    expect(root.findAllByType(List.Item)).toEqual([]);

    const panel = await render(empty.props.actions);
    await flush(() =>
      panel.root
        .findAllByType(Action)
        .find((n) => n.props.title === "Retry")
        ?.props.onAction(),
    );
    expect(useCachedPromiseFixtures.revalidateOf(listOutdated)).toHaveBeenCalledTimes(1);
  });

  it("renders MissingMise and a mise not found subtitle when the configured path does not exist", async () => {
    mocks.getPreferenceValues.mockReturnValue({ misePath: "/nonexistent/mise" });
    const { root } = await render(<Command {...launch} />);
    expect(root.findByType(Detail).props.markdown).toContain("curl https://mise.run");
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "mise not found" });
  });
});
