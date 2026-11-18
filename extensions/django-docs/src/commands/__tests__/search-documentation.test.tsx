import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { showToast, Toast } from "@raycast/api";
import SearchDocumentationCommand from "../search-documentation";
import { fetchDocEntries } from "../../services/django-docs";
import { readCache, writeCache } from "../../services/cache";
import { DocEntry } from "../../types/DocEntry";

jest.mock("../../services/django-docs");
jest.mock("../../services/cache");

// Mock useCachedPromise to simulate the hook behavior
jest.mock("@raycast/utils", () => ({
  useCachedPromise: jest.fn(
    (fn: (...args: unknown[]) => Promise<unknown>, args: unknown[], options?: { onError?: (error: Error) => void }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const React = require("react");
      const [result, setResult] = React.useState({
        data: undefined as unknown,
        isLoading: true,
        error: undefined as unknown,
      });

      React.useEffect(() => {
        let cancelled = false;
        fn(...args)
          .then((data: unknown) => {
            if (!cancelled) {
              setResult({ data, isLoading: false, error: undefined });
            }
          })
          .catch((error: Error) => {
            if (!cancelled) {
              setResult({ data: undefined, isLoading: false, error });
              options?.onError?.(error);
            }
          });
        return () => {
          cancelled = true;
        };
      }, [...args]);

      return result;
    },
  ),
}));

const mockedFetchDocEntries = fetchDocEntries as jest.MockedFunction<typeof fetchDocEntries>;
const mockedReadCache = readCache as jest.MockedFunction<typeof readCache>;
const mockedWriteCache = writeCache as jest.MockedFunction<typeof writeCache>;
const mockedShowToast = showToast as jest.MockedFunction<typeof showToast>;

describe("SearchDocumentationCommand", () => {
  let consoleErrorSpy: jest.SpyInstance;

  // Create entries with proper circular references
  const topicsEntry: DocEntry = {
    url: "https://docs.djangoproject.com/en/dev/topics/",
    title: "Topics",
    content: "Topics content",
    headings: [],
    parent: null,
    previous: null,
    next: null,
  };

  const httpEntry: DocEntry = {
    url: "https://docs.djangoproject.com/en/dev/topics/http/",
    title: "HTTP Request Handling",
    content: "HTTP content",
    headings: [],
    parent: topicsEntry,
    previous: null,
    next: null,
  };

  const dbEntry: DocEntry = {
    url: "https://docs.djangoproject.com/en/dev/topics/db/",
    title: "Database",
    content: "Database content",
    headings: [],
    parent: null,
    previous: null,
    next: null,
  };

  const formsEntry: DocEntry = {
    url: "https://docs.djangoproject.com/en/dev/topics/forms/",
    title: "Forms",
    content: "Forms content",
    headings: [],
    parent: null,
    previous: null,
    next: null,
  };

  // Array includes parent entry so it can be resolved during deserialization
  const mockEntries: DocEntry[] = [topicsEntry, httpEntry, dbEntry, formsEntry];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockToast = { hide: jest.fn() };
    mockedShowToast.mockResolvedValue(mockToast as unknown as Awaited<ReturnType<typeof showToast>>);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("loading from cache", () => {
    it("loads entries from cache when cache exists", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      expect(mockedReadCache).toHaveBeenCalledWith("6.0");
      expect(mockedFetchDocEntries).not.toHaveBeenCalled();
      expect(mockedShowToast).not.toHaveBeenCalled();

      const listItems = screen.getAllByTestId("list-item");
      expect(listItems).toHaveLength(4);
    });

    it("displays loading state initially", () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "true");
    });

    it("displays entries with correct titles and subtitles", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const items = screen.getAllByTestId("list-item");
      // Index 0 is Topics (parent), Index 1 is HTTP Request Handling (child of Topics)
      expect(items[0]).toHaveAttribute("data-title", "Topics");
      expect(items[0]).toHaveAttribute("data-subtitle", "");
      expect(items[1]).toHaveAttribute("data-title", "HTTP Request Handling");
      expect(items[1]).toHaveAttribute("data-subtitle", "Topics");
      expect(items[2]).toHaveAttribute("data-title", "Database");
      expect(items[2]).toHaveAttribute("data-subtitle", "");
      expect(items[3]).toHaveAttribute("data-title", "Forms");
    });

    it("displays document icon for each item", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const items = screen.getAllByTestId("list-item");
      items.forEach((item) => {
        expect(item).toHaveAttribute("data-icon", "document");
      });
    });
  });

  describe("fetching from API", () => {
    it("fetches entries from API when cache is empty", async () => {
      mockedReadCache.mockReturnValue(null);
      mockedFetchDocEntries.mockResolvedValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(mockedFetchDocEntries).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Animated,
        title: "Fetching documentation...",
      });

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Loaded 4 documentation pages",
      });

      const listItems = screen.getAllByTestId("list-item");
      expect(listItems).toHaveLength(4);
    });

    it("fetches entries when cache returns empty array", async () => {
      mockedReadCache.mockReturnValue([]);
      mockedFetchDocEntries.mockResolvedValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(mockedFetchDocEntries).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      expect(mockedWriteCache).toHaveBeenCalledWith("6.0", mockEntries);
    });

    it("writes fetched entries to cache", async () => {
      mockedReadCache.mockReturnValue(null);
      mockedFetchDocEntries.mockResolvedValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(mockedWriteCache).toHaveBeenCalledWith("6.0", mockEntries);
      });
    });

    it("hides animated toast after fetching", async () => {
      const mockToast = { hide: jest.fn() };
      mockedShowToast.mockResolvedValue(mockToast as unknown as Awaited<ReturnType<typeof showToast>>);
      mockedReadCache.mockReturnValue(null);
      mockedFetchDocEntries.mockResolvedValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(mockToast.hide).toHaveBeenCalled();
      });
    });

    it("shows success toast with correct entry count", async () => {
      mockedReadCache.mockReturnValue(null);
      mockedFetchDocEntries.mockResolvedValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(mockedShowToast).toHaveBeenCalledWith({
          style: Toast.Style.Success,
          title: "Loaded 4 documentation pages",
        });
      });
    });

    it("handles empty fetch result", async () => {
      mockedReadCache.mockReturnValue(null);
      mockedFetchDocEntries.mockResolvedValue([]);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Loaded 0 documentation pages",
      });

      const listItems = screen.queryAllByTestId("list-item");
      expect(listItems).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("shows failure toast when fetch fails", async () => {
      mockedReadCache.mockReturnValue(null);
      const error = new Error("Network error");
      mockedFetchDocEntries.mockRejectedValue(error);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(mockedShowToast).toHaveBeenCalledWith({
          style: Toast.Style.Failure,
          title: "Failed to load documentation",
        });
      });

      expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading docs:", error);
    });

    it("stops loading when fetch fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      mockedReadCache.mockReturnValue(null);
      mockedFetchDocEntries.mockRejectedValue(new Error("Network error"));

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const listItems = screen.queryAllByTestId("list-item");
      expect(listItems).toHaveLength(0);

      consoleErrorSpy.mockRestore();
    });

    it("does not write to cache when fetch fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        mockedReadCache.mockReturnValue(null);
        mockedFetchDocEntries.mockRejectedValue(new Error("Network error"));

        render(<SearchDocumentationCommand />);

        await waitFor(() => {
          expect(mockedShowToast).toHaveBeenCalledWith({
            style: Toast.Style.Failure,
            title: "Failed to load documentation",
          });
        });

        expect(mockedWriteCache).not.toHaveBeenCalled();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe("version dropdown", () => {
    it("renders version dropdown with default version 6.0", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const dropdown = screen.getByTestId("list-dropdown");
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveAttribute("data-tooltip", "Select a version");
      expect(dropdown).toHaveValue("6.0");
    });

    it("renders all version options", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const dropdown = screen.getByTestId("list-dropdown");
      const options = dropdown.querySelectorAll("option");
      expect(options).toHaveLength(6);

      expect(options[0]).toHaveAttribute("value", "dev");
      expect(options[1]).toHaveAttribute("value", "6.0");
      expect(options[2]).toHaveAttribute("value", "5.2");
      expect(options[3]).toHaveAttribute("value", "5.1");
      expect(options[4]).toHaveAttribute("value", "5.0");
      expect(options[5]).toHaveAttribute("value", "4.2");
    });

    it("reloads docs when version changes", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Initial load should read cache with default version
      expect(mockedReadCache).toHaveBeenCalledWith("6.0");
      expect(mockedReadCache).toHaveBeenCalledTimes(1);

      // Change version via dropdown
      const dropdown = screen.getByTestId("list-dropdown");
      fireEvent.change(dropdown, { target: { value: "5.1" } });

      // Wait for the UI to settle after version change
      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Verify readCache was called again with the new version
      expect(mockedReadCache).toHaveBeenCalledWith("5.1");
      expect(mockedReadCache).toHaveBeenCalledTimes(2);
    });
  });

  describe("action panel", () => {
    it("renders action panel for each list item", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const actionPanels = screen.getAllByTestId("action-panel");
      expect(actionPanels.length).toBeGreaterThanOrEqual(3);
    });

    it("renders push action with DocDetail component", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const pushActions = screen.getAllByTestId("action-push");
      const viewDocActions = pushActions.filter((action) => action.getAttribute("data-title") === "View Documentation");
      expect(viewDocActions).toHaveLength(4);
    });

    it("renders open in browser action with correct URL", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const openActions = screen.getAllByTestId("action-open-browser");
      expect(openActions.length).toBeGreaterThanOrEqual(3);

      const mainActions = openActions.filter((action) =>
        mockEntries.some((entry) => action.getAttribute("data-url") === entry.url),
      );
      expect(mainActions.length).toBeGreaterThanOrEqual(3);
    });

    it("renders copy to clipboard action with correct URL", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const copyActions = screen.getAllByTestId("action-copy");
      expect(copyActions.length).toBeGreaterThanOrEqual(3);

      const mainActions = copyActions.filter((action) =>
        mockEntries.some((entry) => action.getAttribute("data-content") === entry.url),
      );
      expect(mainActions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("search bar", () => {
    it("renders search bar with correct placeholder", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const list = screen.getByTestId("list");
      expect(list).toHaveAttribute("data-placeholder", "Search Django Documentation...");
    });
  });

  describe("unique keys", () => {
    it("uses URL as key for list items", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const listItems = screen.getAllByTestId("list-item");
      expect(listItems).toHaveLength(4);

      // Verify each list item exposes the correct URL from mockEntries
      listItems.forEach((item, index) => {
        expect(item).toHaveAttribute("data-url", mockEntries[index].url);
      });
    });
  });

  describe("integration scenarios", () => {
    it("loads from cache, then user can see entries immediately", async () => {
      mockedReadCache.mockReturnValue(mockEntries);

      render(<SearchDocumentationCommand />);

      expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "true");

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      expect(mockedFetchDocEntries).not.toHaveBeenCalled();
      const listItems = screen.getAllByTestId("list-item");
      expect(listItems).toHaveLength(4);
    });

    it("fetches from API, shows toast, caches result, then displays entries", async () => {
      mockedReadCache.mockReturnValue(null);
      mockedFetchDocEntries.mockResolvedValue(mockEntries);

      render(<SearchDocumentationCommand />);

      expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "true");

      await waitFor(() => {
        expect(mockedShowToast).toHaveBeenCalledWith({
          style: Toast.Style.Animated,
          title: "Fetching documentation...",
        });
      });

      await waitFor(() => {
        expect(mockedFetchDocEntries).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockedWriteCache).toHaveBeenCalledWith("6.0", mockEntries);
      });

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const listItems = screen.getAllByTestId("list-item");
      expect(listItems).toHaveLength(4);
    });
  });
});
