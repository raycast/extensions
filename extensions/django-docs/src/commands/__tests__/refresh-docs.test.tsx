import { showToast, Toast, LaunchType } from "@raycast/api";
import RefreshDocsCommand from "../refresh-docs";
import { fetchDocEntries } from "../../services/django-docs";
import { writeCache, shouldRefresh } from "../../services/cache";
import { DJANGO_VERSIONS } from "../../constants";
import { DocEntry } from "../../types/DocEntry";

jest.mock("../../services/django-docs");
jest.mock("../../services/cache");

const mockedFetchDocEntries = fetchDocEntries as jest.MockedFunction<typeof fetchDocEntries>;
const mockedWriteCache = writeCache as jest.MockedFunction<typeof writeCache>;
const mockedShouldRefresh = shouldRefresh as jest.MockedFunction<typeof shouldRefresh>;
const mockedShowToast = showToast as jest.MockedFunction<typeof showToast>;

describe("RefreshDocsCommand", () => {
  let consoleErrorSpy: jest.SpyInstance;

  const mockEntries: DocEntry[] = [
    {
      url: "https://docs.djangoproject.com/en/dev/topics/http/",
      title: "HTTP",
      content: "HTTP content",
      headings: [],
      parent: null,
      previous: null,
      next: null,
    },
    {
      url: "https://docs.djangoproject.com/en/dev/topics/db/",
      title: "Database",
      content: "Database content",
      headings: [],
      parent: null,
      previous: null,
      next: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedFetchDocEntries.mockResolvedValue(mockEntries);
    mockedShowToast.mockResolvedValue({ hide: jest.fn() } as unknown as Awaited<ReturnType<typeof showToast>>);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("user-initiated refresh", () => {
    it("refreshes all versions when no version specified", async () => {
      mockedShouldRefresh.mockReturnValue(true);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: undefined,
      });

      expect(mockedShouldRefresh).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);
      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);
      expect(mockedWriteCache).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);

      DJANGO_VERSIONS.forEach((version) => {
        expect(mockedShouldRefresh).toHaveBeenCalledWith(version);
        expect(mockedWriteCache).toHaveBeenCalledWith(version, mockEntries);
      });
    });

    it("refreshes specific version when version is specified", async () => {
      mockedShouldRefresh.mockReturnValue(true);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0" },
      });

      expect(mockedShouldRefresh).toHaveBeenCalledTimes(1);
      expect(mockedShouldRefresh).toHaveBeenCalledWith("6.0");
      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(1);
      expect(mockedWriteCache).toHaveBeenCalledWith("6.0", mockEntries);
    });

    it("shows animated toast when starting refresh", async () => {
      mockedShouldRefresh.mockReturnValue(true);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0" },
      });

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Animated,
        title: "Refreshing 6.0 docs...",
      });
    });

    it("shows success toast with entry count after refresh", async () => {
      mockedShouldRefresh.mockReturnValue(true);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0" },
      });

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Refreshed 6.0 docs",
        message: "2 pages cached",
      });
    });

    it("skips refresh if cache is up to date and shows success toast", async () => {
      mockedShouldRefresh.mockReturnValue(false);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0" },
      });

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Cache for 6.0 is up to date",
      });
      expect(mockedFetchDocEntries).not.toHaveBeenCalled();
      expect(mockedWriteCache).not.toHaveBeenCalled();
    });

    it("force refreshes even when cache is up to date", async () => {
      mockedShouldRefresh.mockReturnValue(false);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0", forceRefresh: true },
      });

      expect(mockedShouldRefresh).not.toHaveBeenCalled();
      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(1);
      expect(mockedWriteCache).toHaveBeenCalledWith("6.0", mockEntries);
    });

    it("shows failure toast when fetch fails", async () => {
      mockedShouldRefresh.mockReturnValue(true);
      const error = new Error("Network error");
      mockedFetchDocEntries.mockRejectedValue(error);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0" },
      });

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Failed to refresh 6.0",
        message: "Network error",
      });
      expect(mockedWriteCache).not.toHaveBeenCalled();
    });

    it("shows failure toast with unknown error message when error is not an Error instance", async () => {
      mockedShouldRefresh.mockReturnValue(true);
      mockedFetchDocEntries.mockRejectedValue("string error");

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0" },
      });

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Failed to refresh 6.0",
        message: "Unknown error",
      });
    });

    it("continues refreshing other versions if one fails", async () => {
      mockedShouldRefresh.mockReturnValue(true);
      mockedFetchDocEntries
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce(mockEntries)
        .mockResolvedValue(mockEntries);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: undefined,
      });

      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);
      expect(mockedWriteCache).toHaveBeenCalledTimes(DJANGO_VERSIONS.length - 1);
    });
  });

  describe("background refresh", () => {
    it("refreshes all versions silently when no version specified", async () => {
      mockedShouldRefresh.mockReturnValue(true);

      await RefreshDocsCommand({
        launchType: LaunchType.Background,
        launchContext: undefined,
      });

      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);
      expect(mockedWriteCache).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);
      expect(mockedShowToast).not.toHaveBeenCalled();
    });

    it("refreshes specific version silently when version is specified", async () => {
      mockedShouldRefresh.mockReturnValue(true);

      await RefreshDocsCommand({
        launchType: LaunchType.Background,
        launchContext: { version: "dev" },
      });

      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(1);
      expect(mockedWriteCache).toHaveBeenCalledWith("dev", mockEntries);
      expect(mockedShowToast).not.toHaveBeenCalled();
    });

    it("does not show toast when cache is up to date", async () => {
      mockedShouldRefresh.mockReturnValue(false);

      await RefreshDocsCommand({
        launchType: LaunchType.Background,
        launchContext: { version: "6.0" },
      });

      expect(mockedShowToast).not.toHaveBeenCalled();
      expect(mockedFetchDocEntries).not.toHaveBeenCalled();
    });

    it("does not show toast when fetch fails", async () => {
      mockedShouldRefresh.mockReturnValue(true);
      mockedFetchDocEntries.mockRejectedValue(new Error("Network error"));

      await RefreshDocsCommand({
        launchType: LaunchType.Background,
        launchContext: { version: "6.0" },
      });

      expect(mockedShowToast).not.toHaveBeenCalled();
    });

    it("force refreshes all versions silently", async () => {
      mockedShouldRefresh.mockReturnValue(false);

      await RefreshDocsCommand({
        launchType: LaunchType.Background,
        launchContext: { forceRefresh: true },
      });

      expect(mockedShouldRefresh).not.toHaveBeenCalled();
      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);
      expect(mockedShowToast).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("logs error to console when fetch fails", async () => {
      mockedShouldRefresh.mockReturnValue(true);
      const error = new Error("Network error");
      mockedFetchDocEntries.mockRejectedValue(error);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0" },
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to refresh 6.0:", error);
    });

    it("handles multiple version failures gracefully", async () => {
      mockedShouldRefresh.mockReturnValue(true);
      mockedFetchDocEntries.mockRejectedValue(new Error("Network error"));

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: undefined,
      });

      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);
      expect(mockedWriteCache).not.toHaveBeenCalled();
      expect(mockedShowToast).toHaveBeenCalledTimes(DJANGO_VERSIONS.length * 2);
    });
  });

  describe("edge cases", () => {
    it("handles empty entries array", async () => {
      mockedShouldRefresh.mockReturnValue(true);
      mockedFetchDocEntries.mockResolvedValue([]);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: { version: "6.0" },
      });

      expect(mockedWriteCache).toHaveBeenCalledWith("6.0", []);
      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Refreshed 6.0 docs",
        message: "0 pages cached",
      });
    });

    it("handles undefined launchContext", async () => {
      mockedShouldRefresh.mockReturnValue(true);

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
      });

      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(DJANGO_VERSIONS.length);
    });

    it("handles all versions with different cache states", async () => {
      mockedShouldRefresh
        .mockReturnValueOnce(true) // 6.0 - refresh
        .mockReturnValueOnce(false) // dev - skip
        .mockReturnValueOnce(true) // 5.2 - refresh
        .mockReturnValueOnce(false) // 5.1 - skip
        .mockReturnValueOnce(true) // 5.0 - refresh
        .mockReturnValueOnce(false); // 4.2 - skip

      await RefreshDocsCommand({
        launchType: LaunchType.UserInitiated,
        launchContext: undefined,
      });

      expect(mockedFetchDocEntries).toHaveBeenCalledTimes(3);
      expect(mockedWriteCache).toHaveBeenCalledTimes(3);
    });
  });
});
