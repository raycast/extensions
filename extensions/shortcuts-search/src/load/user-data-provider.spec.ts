jest.mock("react", () => ({ useEffect: jest.fn(), useSyncExternalStore: jest.fn(() => ({ initialized: true })) }));
jest.mock(
  "@raycast/api",
  () => ({ showToast: jest.fn(), Toast: { Style: { Success: "success", Failure: "failure" } } }),
  { virtual: true }
);
jest.mock("../auth/session", () => ({
  getAccessToken: jest.fn(),
  isAccessTokenCurrent: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock("../user-data/service", () => ({ userDataService: { load: jest.fn(), toggleFavorite: jest.fn() } }));
import { showToast } from "@raycast/api";
import { getAccessToken } from "../auth/session";
import { userDataService } from "../user-data/service";
import type { FavoriteIdentifier } from "../user-data/favorites";
import { useUserData } from "./user-data-provider";

const identifier: FavoriteIdentifier = { itemType: "app", appSlug: "vscode" };

it.each([
  ["cancelled sign in", () => jest.mocked(getAccessToken).mockResolvedValue(null), "Sign in was cancelled"],
  ["token failure", () => jest.mocked(getAccessToken).mockRejectedValue(new Error("Network down")), "Network down"],
])("shows a failure toast instead of rejecting on %s", async (_name, arrange, message) => {
  arrange();
  await expect(useUserData().toggleFavorite(identifier)).resolves.toBeUndefined();
  expect(userDataService.toggleFavorite).not.toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledWith({ style: "failure", title: "Favorite could not be updated", message });
});
