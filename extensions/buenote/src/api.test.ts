import {
  fetchRecentTemplates,
  searchTemplates,
  runTemplate,
  pollTask,
} from "./api";

describe("Raycast API helpers", () => {
  it("fetchRecentTemplates returns array", async () => {
    // This is a placeholder; in real CI, mock fetch and token
    expect(Array.isArray(await fetchRecentTemplates())).toBe(true);
  });

  it("searchTemplates returns array", async () => {
    expect(Array.isArray(await searchTemplates("test"))).toBe(true);
  });

  it("runTemplate throws on missing inputs", async () => {
    await expect(runTemplate(999999, {})).rejects.toThrow();
  });

  it("pollTask throws on invalid id", async () => {
    await expect(pollTask("invalid-task-id")).rejects.toThrow();
  });
});
