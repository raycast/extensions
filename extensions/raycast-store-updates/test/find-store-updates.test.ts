import { beforeEach, expect, test, vi } from "vitest";
import findStoreUpdates from "../src/tools/find-store-updates";
import { fetchInstalledExtensionSlugs, fetchStoreUpdates } from "../src/utils";

vi.mock("../src/utils", () => ({
  fetchStoreUpdates: vi.fn(),
  fetchInstalledExtensionSlugs: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(fetchStoreUpdates).mockReset();
  vi.mocked(fetchInstalledExtensionSlugs).mockReset();
  vi.mocked(fetchInstalledExtensionSlugs).mockResolvedValue(new Set());
});

function item(title: string, date: string) {
  return {
    id: title,
    title,
    summary: "",
    image: "",
    date,
    authorName: "",
    authorUrl: "",
    url: "",
    type: "new" as const,
  };
}

test("since includes midnight UTC and excludes earlier updates", async () => {
  vi.mocked(fetchStoreUpdates).mockResolvedValue([
    item("Earlier", "2026-08-31T23:59:59Z"),
    item("At cutoff", "2026-09-01T00:00:00Z"),
    item("Later", "2026-09-02T12:00:00Z"),
  ]);

  const result = await findStoreUpdates({ type: "new", since: "2026-09-01" });

  expect(result.totalMatches).toBe(2);
  expect(result.items.map((item) => item.title)).toEqual(["At cutoff", "Later"]);
});

test("limit returns two items while counting all four matches", async () => {
  vi.mocked(fetchStoreUpdates).mockResolvedValue([
    item("First", "2026-09-22T12:00:00Z"),
    item("Second", "2026-09-21T12:00:00Z"),
    item("Third", "2026-09-20T12:00:00Z"),
    item("Fourth", "2026-09-19T12:00:00Z"),
  ]);

  const result = await findStoreUpdates({ type: "new", limit: 2 });

  expect(result.totalMatches).toBe(4);
  expect(result.items.map((item) => item.title)).toEqual(["First", "Second"]);
});

test("invalid since dates fail before fetching", async () => {
  await expect(findStoreUpdates({ since: "2026-02-30" })).rejects.toThrow(/since must be a valid date/);
  await expect(findStoreUpdates({ since: "09/01/2026" })).rejects.toThrow(/since must be a valid date/);
  expect(fetchStoreUpdates).not.toHaveBeenCalled();
});

test("installed lookup failure is reported instead of claiming no matches", async () => {
  vi.mocked(fetchStoreUpdates).mockResolvedValue([]);
  vi.mocked(fetchInstalledExtensionSlugs).mockResolvedValue(null);

  await expect(findStoreUpdates({ installedOnly: true })).rejects.toThrow(/Installed extensions could not be determined/);
});
