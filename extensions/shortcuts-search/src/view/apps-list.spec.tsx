jest.mock("../load/platform", () => ({ getPlatform: () => "macos" }));
import { AppsList } from "./apps-list";
import type { AppsFilter } from "../user-data/view-models";

jest.mock(
  "@raycast/api",
  () => ({
    List: Object.assign(() => null, {
      EmptyView: "EmptyView",
      Item: "Item",
      Dropdown: Object.assign(() => null, { Item: "DropdownItem" }),
    }),
    Action: { Push: "Push" },
    ActionPanel: "ActionPanel",
    Icon: {},
  }),
  { virtual: true }
);
jest.mock("@raycast/utils", () => ({
  getAvatarIcon: () => "avatar",
  useFrecencySorting: (data: unknown[]) => ({ data, visitItem: jest.fn() }),
}));
jest.mock("../app-shortcuts", () => () => null);
jest.mock("../config/catalog", () => ({ catalogUrl: (path: string) => path }));
jest.mock("./account-actions", () => ({ AccountActions: "AccountActions" }));
jest.mock("./favorite-action", () => ({ FavoriteAction: "FavoriteAction" }));

type Element = { props: { children: [Element | null, Element[]]; title: string; description?: string } };
function list(filter: AppsFilter, accountError?: string) {
  return AppsList({
    apps: [{ name: "Safari", slug: "safari", bundleId: "com.apple.Safari", keymaps: [] }],
    customizations: undefined,
    favorites: [],
    filter,
    isLoading: false,
    accountError,
    onFilterChange: jest.fn(),
    onToggleFavorite: jest.fn(),
  }) as unknown as Element;
}

it.each(["favorites", "customized"] as const)("shows a retryable failure instead of empty %s", (filter) => {
  const empty = list(filter, "Network unavailable").props.children[0] as Element;
  expect(empty.props.title).toBe("Account sync failed");
  expect(empty.props.description).toBe("Open Actions and choose Retry Account Sync.");
});

it("keeps the ordinary empty state after a successful account load", () => {
  const empty = list("favorites").props.children[0] as Element;
  expect(empty.props.title).toBe("No favorite applications");
  expect(empty.props.description).toBeUndefined();
});

it("keeps public applications available during an account failure", () => {
  const result = list("all", "Network unavailable");
  expect(result.props.children[0]).toBeNull();
  expect(result.props.children[1][0].props.title).toBe("Safari");
});
