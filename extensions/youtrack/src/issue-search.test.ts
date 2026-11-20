import type { Issue } from "./interfaces";
import { fetchIssueSearchResults } from "./issue-search";

const issue = { id: "DEMO-1" } as Issue;

describe("fetchIssueSearchResults", () => {
  test("should return fetched issues", async () => {
    const fetchIssues = vi.fn().mockResolvedValue([issue]);

    await expect(fetchIssueSearchResults("State: Open", 50, true, fetchIssues)).resolves.toEqual([issue]);
    expect(fetchIssues).toHaveBeenCalledWith("State: Open", 50);
  });

  test("should treat a bad request as an empty intermediate search", async () => {
    const fetchIssues = vi.fn().mockRejectedValue(new Error("Error: 400 Bad Request"));

    await expect(fetchIssueSearchResults("State: ", 50, true, fetchIssues)).resolves.toEqual([]);
  });

  test("should surface a bad request from the configured query", async () => {
    const error = new Error("Error: 400 Bad Request");
    const fetchIssues = vi.fn().mockRejectedValue(error);

    await expect(fetchIssueSearchResults("State: ", 50, false, fetchIssues)).rejects.toBe(error);
  });

  test("should surface all other search failures", async () => {
    const error = new Error("Error: 500 Internal Server Error");
    const fetchIssues = vi.fn().mockRejectedValue(error);

    await expect(fetchIssueSearchResults("State: Open", 50, true, fetchIssues)).rejects.toBe(error);
  });
});
