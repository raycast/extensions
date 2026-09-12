import { showFailureToast } from "@raycast/utils";
import { getProjectMembers, getTaskLists, getTaskStatuses, getTasks } from "../src/composables/FetchData";
import { fetchWithTimeout } from "../src/composables/HttpClient";

jest.mock("@raycast/api", () => ({ getPreferenceValues: () => ({}) }), { virtual: true });
jest.mock("@raycast/utils", () => ({ showFailureToast: jest.fn() }));
jest.mock("../src/composables/WebClient", () => ({
  baseURI: "https://api.awork.test/api/v1",
  refreshToken: jest.fn(),
}));
jest.mock("../src/composables/HttpClient", () => ({ fetchWithTimeout: jest.fn() }));

const fetchWithTimeoutMock = jest.mocked(fetchWithTimeout);
const showFailureToastMock = jest.mocked(showFailureToast);

describe("reference-data permission handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("surfaces the task-list permission required by awork to AI tools", async () => {
    fetchWithTimeoutMock.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(getTaskLists("token", "project-id", { throwOnError: true })).rejects.toThrow(
      "awork requires project-planning-data:read",
    );
    expect(showFailureToastMock).not.toHaveBeenCalled();
  });

  it("surfaces the project-member permission required by awork to AI tools", async () => {
    fetchWithTimeoutMock.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(getProjectMembers("token", "project-id", { throwOnError: true })).rejects.toThrow(
      "awork requires project-master-data:read or project ownership",
    );
    expect(showFailureToastMock).not.toHaveBeenCalled();
  });

  it("surfaces task-status lookup failures to AI tools instead of returning no statuses", async () => {
    fetchWithTimeoutMock.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(getTaskStatuses("token", "project-id", { throwOnError: true })).rejects.toThrow(
      "Couldn´t load task statuses",
    );
    expect(showFailureToastMock).not.toHaveBeenCalled();
  });

  it("keeps the existing form behavior for permission errors", async () => {
    fetchWithTimeoutMock.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(getTaskLists("token", "project-id")).resolves.toEqual([]);
    expect(showFailureToastMock).toHaveBeenCalledTimes(1);
  });

  it("does not mistake a genuinely empty result for a permission error", async () => {
    fetchWithTimeoutMock.mockResolvedValue(Response.json([]));

    await expect(getProjectMembers("token", "project-id", { throwOnError: true })).resolves.toEqual([]);
  });

  it("still filters archived task lists and deactivated project members", async () => {
    fetchWithTimeoutMock
      .mockResolvedValueOnce(
        Response.json([
          { id: "active", name: "Backlog", isArchived: false },
          { id: "archived", name: "Old", isArchived: true },
        ]),
      )
      .mockResolvedValueOnce(
        Response.json([
          { id: "1", userId: "active", firstName: "Alice", isDeactivated: false, isExternal: false },
          { id: "2", userId: "inactive", firstName: "Bob", isDeactivated: true, isExternal: false },
        ]),
      );

    await expect(getTaskLists("token", "project-id", { throwOnError: true })).resolves.toMatchObject([
      { id: "active" },
    ]);
    await expect(getProjectMembers("token", "project-id", { throwOnError: true })).resolves.toMatchObject([
      { userId: "active" },
    ]);
  });

  it("loads a parent task regardless of the show-done preference", async () => {
    const parentTaskId = "123e4567-e89b-42d3-a456-426614174000";
    fetchWithTimeoutMock.mockResolvedValue(Response.json([]));

    await getTasks("token", parentTaskId, 1, "project-id", { includeDone: true, throwOnError: true })({ page: 0 });

    const requestedUrl = String(fetchWithTimeoutMock.mock.calls[0][0]);
    expect(requestedUrl).toContain(`id%20eq%20guid%27${parentTaskId}%27`);
    expect(requestedUrl).not.toContain("taskstatus/type%20ne%20%27done%27");
  });

  it("surfaces parent-task lookup failures to the AI tool", async () => {
    fetchWithTimeoutMock.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(
      getTasks("token", "123e4567-e89b-42d3-a456-426614174000", 1, "project-id", {
        includeDone: true,
        throwOnError: true,
      })({ page: 0 }),
    ).rejects.toThrow("HTTP error! status: 403");
    expect(showFailureToastMock).not.toHaveBeenCalled();
  });
});
