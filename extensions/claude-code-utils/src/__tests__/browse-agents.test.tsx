/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import BrowseAgents from "../commands/browse-agents/list";
import * as agentsUtils from "../utils/agent";

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
      <div data-testid="list" data-loading={isLoading} data-placeholder={searchBarPlaceholder}>
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
        accessories: Array<{ text: string }>;
        actions: React.ReactNode;
      }) => (
        <div data-testid="list-item" data-title={title} data-icon={icon} data-accessories={JSON.stringify(accessories)}>
          {actions}
        </div>
      ),
      EmptyView: ({ title, description }: { title: string; description: string }) => (
        <div data-testid="empty-view">
          <div data-testid="empty-title">{title}</div>
          <div data-testid="empty-description">{description}</div>
        </div>
      ),
    },
  ),
  ActionPanel: ({ children }: { children: React.ReactNode }) => <div data-testid="action-panel">{children}</div>,
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
    ShowInFinder: () => <button data-testid="action-show-finder" />,
    OpenWith: () => <button data-testid="action-open-with" />,
  },
  Icon: {
    CodeBlock: "codeblock-icon",
    Eye: "eye-icon",
    Clipboard: "clipboard-icon",
    Document: "document-icon",
    ExclamationMark: "exclamation-icon",
  },
}));

// Mock agent-detail component
jest.mock("../commands/browse-agents/detail", () => ({
  __esModule: true,
  default: () => <div data-testid="agent-detail">Agent Detail</div>,
}));

// Mock agents utils
jest.mock("../utils/agent");

const mockGetAgents = agentsUtils.getAgents as jest.MockedFunction<typeof agentsUtils.getAgents>;

describe("BrowseAgents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render loading state initially", () => {
    mockGetAgents.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<BrowseAgents />);

    const list = screen.getByTestId("list");
    expect(list).toHaveAttribute("data-loading", "true");
  });

  it("should render agents list", async () => {
    const mockAgents = [
      {
        id: "test-agent",
        name: "Test Agent",
        content: "# Test Agent Content",
        filePath: "/path/to/test-agent.md",
      },
      {
        id: "another-agent",
        name: "Another Agent",
        content: "# Another Agent Content",
        filePath: "/path/to/another-agent.md",
      },
    ];

    mockGetAgents.mockResolvedValue(mockAgents);

    render(<BrowseAgents />);

    await waitFor(() => {
      const list = screen.getByTestId("list");
      expect(list).toHaveAttribute("data-loading", "false");
    });

    const items = screen.getAllByTestId("list-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-title", "Test Agent");
    expect(items[1]).toHaveAttribute("data-title", "Another Agent");
  });

  it("should show empty view when no agents found", async () => {
    mockGetAgents.mockResolvedValue([]);

    render(<BrowseAgents />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No Agents Found");
    expect(screen.getByTestId("empty-description")).toHaveTextContent("No agent files found in ~/.claude/agents");
  });

  it("should show error view on failure", async () => {
    mockGetAgents.mockRejectedValue(new Error("Failed to read directory"));

    render(<BrowseAgents />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("empty-title")).toHaveTextContent("Error Loading Agents");
    expect(screen.getByTestId("empty-description")).toHaveTextContent("Failed to read directory");
  });

  it("should render actions for each agent", async () => {
    const mockAgents = [
      {
        id: "test-agent",
        name: "Test Agent",
        content: "# Test Agent Content",
        filePath: "/path/to/test-agent.md",
      },
    ];

    mockGetAgents.mockResolvedValue(mockAgents);

    render(<BrowseAgents />);

    await waitFor(() => {
      expect(screen.getByTestId("action-panel")).toBeInTheDocument();
    });

    const pushAction = screen.getByTestId("action-push");
    expect(pushAction).toHaveAttribute("data-title", "View Agent Details");

    const copyAction = screen.getByTestId("action-copy");
    expect(copyAction).toHaveAttribute("data-title", "Copy to Clipboard");

    expect(screen.getByTestId("action-show-finder")).toBeInTheDocument();
  });

  it("should display agent filename as accessory", async () => {
    const mockAgents = [
      {
        id: "test-agent",
        name: "Test Agent",
        content: "# Test Agent Content",
        filePath: "/path/to/test-agent.md",
      },
    ];

    mockGetAgents.mockResolvedValue(mockAgents);

    render(<BrowseAgents />);

    await waitFor(() => {
      const item = screen.getByTestId("list-item");
      const accessories = JSON.parse(item.getAttribute("data-accessories") || "[]");
      expect(accessories).toEqual([{ text: "test-agent.md" }]);
    });
  });
});
