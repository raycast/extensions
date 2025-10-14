/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Changelog from "../commands/changelog/list";
import * as changelogUtils from "../utils/changelog";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  List: Object.assign(
    ({
      children,
      isLoading,
      searchBarPlaceholder,
    }: {
      children: React.ReactNode;
      isLoading: boolean;
      searchBarPlaceholder: string;
    }) => (
      <div
        data-testid="list"
        data-loading={isLoading}
        data-placeholder={searchBarPlaceholder}
      >
        {children}
      </div>
    ),
    {
      Item: ({
        title,
        icon,
        accessories,
        actions,
      }: {
        title: string;
        icon: string;
        accessories: Array<{ text?: string; tag?: string }>;
        actions: React.ReactNode;
      }) => (
        <div
          data-testid="list-item"
          data-title={title}
          data-icon={icon}
          data-accessories={JSON.stringify(accessories)}
        >
          {actions}
        </div>
      ),
      EmptyView: ({
        icon,
        title,
        description,
      }: {
        icon: string;
        title: string;
        description: string;
      }) => (
        <div data-testid="empty-view" data-icon={icon}>
          <div data-testid="empty-title">{title}</div>
          <div data-testid="empty-description">{description}</div>
        </div>
      ),
    },
  ),
  ActionPanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="action-panel">{children}</div>
  ),
  Action: {
    Push: ({ title }: { title: string }) => (
      <button data-testid="action-push" data-title={title}>
        {title}
      </button>
    ),
    CopyToClipboard: ({ title }: { title: string }) => (
      <button data-testid="action-copy" data-title={title}>
        {title}
      </button>
    ),
    OpenInBrowser: ({ title }: { title: string }) => (
      <button data-testid="action-browser" data-title={title}>
        {title}
      </button>
    ),
  },
  Icon: {
    Document: "document-icon",
    Eye: "eye-icon",
    Clipboard: "clipboard-icon",
    Globe: "globe-icon",
    ExclamationMark: "exclamation-icon",
  },
  showToast: jest.fn(),
  Toast: {
    Style: {
      Failure: "failure",
    },
  },
  environment: {
    isDevelopment: false,
  },
}));

// Mock changelog-detail component
jest.mock("../commands/changelog/detail", () => ({
  __esModule: true,
  default: () => <div data-testid="changelog-detail">Changelog Detail</div>,
}));

// Mock changelog utils
jest.mock("../utils/changelog");

const mockFetchChangelog = changelogUtils.fetchChangelog as jest.MockedFunction<
  typeof changelogUtils.fetchChangelog
>;

describe("Changelog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render loading state initially", () => {
    mockFetchChangelog.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<Changelog />);

    const list = screen.getByTestId("list");
    expect(list).toHaveAttribute("data-loading", "true");
  });

  it("should render changelog list", async () => {
    const mockVersions = [
      {
        version: "1.2.0",
        changes: ["Feature A", "Feature B", "Feature C"],
      },
      {
        version: "1.1.0",
        changes: ["Bug fix"],
      },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      const list = screen.getByTestId("list");
      expect(list).toHaveAttribute("data-loading", "false");
    });

    const items = screen.getAllByTestId("list-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-title", "1.2.0");
    expect(items[1]).toHaveAttribute("data-title", "1.1.0");
  });

  it("should display correct accessories for single change", async () => {
    const mockVersions = [
      {
        version: "1.0.0",
        changes: ["Initial release"],
      },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      const item = screen.getByTestId("list-item");
      const accessories = JSON.parse(
        item.getAttribute("data-accessories") || "[]",
      );
      expect(accessories).toEqual([{ text: "1 change" }]);
    });
  });

  it("should display correct accessories for multiple changes", async () => {
    const mockVersions = [
      {
        version: "2.0.0",
        changes: ["Change 1", "Change 2"],
      },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      const item = screen.getByTestId("list-item");
      const accessories = JSON.parse(
        item.getAttribute("data-accessories") || "[]",
      );
      expect(accessories).toEqual([{ text: "2 changes" }]);
    });
  });

  it("should show error view on failure", async () => {
    mockFetchChangelog.mockRejectedValue(
      new Error("Failed to fetch changelog"),
    );

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("empty-title")).toHaveTextContent(
      "Failed to Load Changelog",
    );
    expect(screen.getByTestId("empty-description")).toHaveTextContent(
      "Failed to fetch changelog",
    );
  });

  it("should render actions for each version", async () => {
    const mockVersions = [
      {
        version: "1.0.0",
        changes: ["Initial release"],
      },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.getByTestId("action-panel")).toBeInTheDocument();
    });

    const pushAction = screen.getByTestId("action-push");
    expect(pushAction).toHaveAttribute("data-title", "View Changes");

    const copyAction = screen.getByTestId("action-copy");
    expect(copyAction).toHaveAttribute("data-title", "Copy to Clipboard");

    const browserAction = screen.getByTestId("action-browser");
    expect(browserAction).toHaveAttribute("data-title", "View on GitHub");
  });

  it("should display changes count in accessories", async () => {
    const mockVersions = [
      {
        version: "2.5.0",
        changes: ["Feature"],
      },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      const item = screen.getByTestId("list-item");
      const accessories = JSON.parse(
        item.getAttribute("data-accessories") || "[]",
      );
      expect(accessories).toEqual([{ text: "1 change" }]);
    });
  });

  it("should handle empty changes array", async () => {
    const mockVersions = [
      {
        version: "1.0.0",
        changes: [],
      },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      const item = screen.getByTestId("list-item");
      const accessories = JSON.parse(
        item.getAttribute("data-accessories") || "[]",
      );
      expect(accessories).toEqual([{ text: "0 changes" }]);
    });
  });

  it("should render correct icon", async () => {
    const mockVersions = [
      {
        version: "1.0.0",
        changes: ["Change"],
      },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      const item = screen.getByTestId("list-item");
      expect(item).toHaveAttribute("data-icon", "document-icon");
    });
  });

  it("should have correct search placeholder", async () => {
    mockFetchChangelog.mockResolvedValue([]);

    render(<Changelog />);

    const list = screen.getByTestId("list");
    expect(list).toHaveAttribute(
      "data-placeholder",
      "Search changelog versions...",
    );
  });

  it("should call fetchChangelog on mount", async () => {
    mockFetchChangelog.mockResolvedValue([]);

    render(<Changelog />);

    await waitFor(() => {
      expect(mockFetchChangelog).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle multiple versions correctly", async () => {
    const mockVersions = [
      { version: "3.0.0", changes: ["Major update"] },
      { version: "2.5.0", changes: ["Minor update"] },
      { version: "2.0.0", changes: ["Breaking change"] },
      { version: "1.0.0", changes: ["Initial release"] },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      const items = screen.getAllByTestId("list-item");
      expect(items).toHaveLength(4);
    });
  });

  it("should not show empty view when versions exist", async () => {
    const mockVersions = [
      {
        version: "1.0.0",
        changes: ["Change"],
      },
    ];

    mockFetchChangelog.mockResolvedValue(mockVersions);

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.queryByTestId("empty-view")).not.toBeInTheDocument();
    });
  });
});
