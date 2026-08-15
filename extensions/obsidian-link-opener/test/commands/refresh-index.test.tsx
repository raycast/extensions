import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import RefreshIndexCommand from "../../src/refresh-index";
import * as fileScanner from "../../src/services/fileScanner";
import * as raycast from "@raycast/api";
import mockFs from "mock-fs";

// Mock the getPreferenceValues before other mocks
vi.mock("@raycast/api", () => ({
  showToast: vi.fn().mockResolvedValue(undefined),
  Toast: {
    Style: {
      Success: "success",
      Failure: "failure",
    },
  },
  Icon: {
    ArrowClockwise: "arrow-clockwise",
    Link: "link",
  },
  Action: ({ title, onAction }) => React.createElement('button', { onClick: onAction }, title),
  ActionPanel: ({ children }) => React.createElement('div', null, children),
  Detail: ({ markdown, isLoading, actions }) => React.createElement('div', null,
    React.createElement('div', { 'data-testid': 'loading' }, String(!!isLoading)),
    React.createElement('div', { 'data-testid': 'markdown' }, markdown),
    React.createElement('div', null, actions)
  ),
  getPreferenceValues: vi.fn().mockReturnValue({
    vaultPath: "/test/vault",
  }),
  launchCommand: vi.fn().mockResolvedValue(undefined),
  LaunchType: {
    UserInitiated: "userInitiated",
  },
}));

// Mock dependencies
vi.mock("../../src/services/fileScanner", () => ({
  scanVaultForUrls: vi.fn().mockImplementation(async () => [
    {
      id: "note1-homepage",
      title: "Note 1",
      path: "note1.md",
      vault: "/test/vault",
      frontmatter: { homepage: "https://example.com" },
      lastModified: new Date(),
      url: "https://example.com",
      urlSource: "homepage",
    },
    {
      id: "note2-github",
      title: "Note 2",
      path: "note2.md",
      vault: "/test/vault",
      frontmatter: { github: "https://github.com/test" },
      lastModified: new Date(),
      url: "https://github.com/test",
      urlSource: "github",
    },
  ]),
}));


// Create a wrapper component for testing
function TestRefreshIndexCommand() {
  return RefreshIndexCommand();
}

describe("RefreshIndexCommand", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Ensure the mock is set up properly
    vi.mocked(fileScanner.scanVaultForUrls).mockResolvedValue([
      {
        id: "note1-homepage",
        title: "Note 1",
        path: "note1.md",
        vault: "/test/vault",
        frontmatter: { homepage: "https://example.com" },
        lastModified: new Date(),
        url: "https://example.com",
        urlSource: "homepage",
      },
      {
        id: "note2-github",
        title: "Note 2",
        path: "note2.md",
        vault: "/test/vault",
        frontmatter: { github: "https://github.com/test" },
        lastModified: new Date(),
        url: "https://github.com/test",
        urlSource: "github",
      },
    ]);

    // Set up mock filesystem
    mockFs({
      "/test/vault": {
        "note1.md": "---\nhomepage: https://example.com\n---\n# Note 1",
        "note2.md": "---\ngithub: https://github.com/test\n---\n# Note 2",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockFs.restore();
  });

  it("should render without crashing", async () => {
    await act(async () => {
      render(<TestRefreshIndexCommand />);
    });
  });

  it("should show loading state initially", async () => {
    render(<TestRefreshIndexCommand />);

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("true");
      expect(screen.getByTestId("markdown")).toHaveTextContent(
        "# ⏳ Refreshing Index"
      );
    }, { timeout: 1000 });
  });

  it("should scan vault on mount", async () => {
    render(<TestRefreshIndexCommand />);

    await waitFor(() => {
      expect(fileScanner.scanVaultForUrls).toHaveBeenCalledTimes(1);
      expect(fileScanner.scanVaultForUrls).toHaveBeenCalledWith(true); // forceRefresh = true
    }, { timeout: 2000 });
  });

  it("should show results after scan completes", async () => {
    render(<TestRefreshIndexCommand />);

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("markdown")).toHaveTextContent(
        "✅ Cache Refreshed"
      );
      expect(screen.getByTestId("markdown")).toHaveTextContent(
        "Notes with URLs"
      );
      expect(screen.getByTestId("markdown")).toHaveTextContent(
        "Total URLs found"
      );
      expect(screen.getByTestId("markdown")).toHaveTextContent(
        "Directories scanned"
      );
      expect(screen.getByTestId("markdown")).toHaveTextContent(
        "The cache has been cleared and rebuilt from scratch."
      );
    }, { timeout: 2000 });
  });

  it("should show toast with results", async () => {
    render(<TestRefreshIndexCommand />);

    await waitFor(() => {
      expect(raycast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "success",
          title: "Cache refreshed",
          message: expect.stringMatching(/Found 2 URLs in 2 notes/),
        })
      );
    }, { timeout: 2000 });
  });

  it("should show error message when scan fails", async () => {
    const error = new Error("Vault path not configured");
    vi.mocked(fileScanner.scanVaultForUrls).mockRejectedValue(error);

    render(<TestRefreshIndexCommand />);

    await waitFor(() => {
      expect(screen.getByTestId("markdown")).toHaveTextContent("❌ Error");
      expect(screen.getByTestId("markdown")).toHaveTextContent(
        "Vault path not configured"
      );
    }, { timeout: 2000 });
  });

  it("should show error toast when scan fails", async () => {
    const error = new Error("Test error");
    vi.mocked(fileScanner.scanVaultForUrls).mockRejectedValue(error);

    render(<TestRefreshIndexCommand />);

    await waitFor(() => {
      expect(raycast.showToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Scan failed",
        message: error.toString(),
      });
    }, { timeout: 2000 });
  });
});