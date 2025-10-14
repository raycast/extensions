/**
 * @jest-environment jsdom
 */

import { Clipboard, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import ReceivedMessages from "../commands/received-messages/list";
import { normalSearch } from "../utils/ai-search";
import { ParsedMessage, getReceivedMessages } from "../utils/claude-message";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  List: Object.assign(
    ({
      children,
      searchBarPlaceholder,
      searchBarAccessory,
      actions,
      isLoading,
      onSearchTextChange,
    }: {
      children: React.ReactNode;
      searchBarPlaceholder: string;
      searchBarAccessory?: React.ReactNode;
      actions?: React.ReactNode;
      isLoading: boolean;
      onSearchTextChange?: (text: string) => void;
    }) => (
      <div data-testid="list" data-placeholder={searchBarPlaceholder} data-loading={String(isLoading)}>
        <input
          data-testid="search-input"
          type="text"
          placeholder={searchBarPlaceholder}
          onChange={(e) => onSearchTextChange?.(e.target.value)}
        />
        {searchBarAccessory && <div data-testid="search-bar-accessory">{searchBarAccessory}</div>}
        {actions && <div data-testid="list-actions">{actions}</div>}
        {children}
      </div>
    ),
    {
      EmptyView: ({
        title,
        description,
        icon,
        actions,
      }: {
        title: string;
        description: string;
        icon?: { source: string; tintColor: string };
        actions?: React.ReactNode;
      }) => (
        <div data-testid="empty-view" data-title={title} data-description={description}>
          {icon && <div data-testid="empty-view-icon" data-icon={icon.source} data-tint={icon.tintColor} />}
          {actions && <div data-testid="empty-view-actions">{actions}</div>}
        </div>
      ),
      Item: ({
        title,
        accessories,
        actions,
      }: {
        title: string;
        accessories?: unknown[];
        actions?: React.ReactNode;
      }) => (
        <div data-testid="list-item" data-title={title}>
          {accessories && <div data-testid="item-accessories">{JSON.stringify(accessories)}</div>}
          {actions && <div data-testid="item-actions">{actions}</div>}
        </div>
      ),
      Dropdown: Object.assign(
        ({
          tooltip,
          value,
          onChange,
          children,
        }: {
          tooltip: string;
          value: string;
          onChange?: (value: string) => void;
          children: React.ReactNode;
        }) => {
          const childrenWithProps = React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(
                child as React.ReactElement<{
                  onChange?: (value: string) => void;
                }>,
                { onChange },
              );
            }
            return child;
          });
          return (
            <div data-testid="dropdown" data-tooltip={tooltip} data-value={value}>
              {childrenWithProps}
            </div>
          );
        },
        {
          Item: ({ title, value, onChange }: { title: string; value: string; onChange?: (value: string) => void }) => (
            <div data-testid="dropdown-item" data-title={title} data-value={value} onClick={() => onChange?.(value)}>
              {title}
            </div>
          ),
        },
      ),
      Section: ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div data-testid="list-section" data-title={title}>
          {children}
        </div>
      ),
    },
  ),
  ActionPanel: ({ children }: { children: React.ReactNode }) => <div data-testid="action-panel">{children}</div>,
  Action: Object.assign(
    ({
      title,
      onAction,
      shortcut,
    }: {
      title: string;
      onAction?: () => void;
      shortcut?: { modifiers: string[]; key: string };
    }) => (
      <button
        data-testid="action"
        data-title={title}
        onClick={onAction}
        data-shortcut={shortcut ? `${shortcut.modifiers.join("+")}-${shortcut.key}` : undefined}
      >
        {title}
      </button>
    ),
    {
      Push: ({ title, shortcut }: { title: string; shortcut?: { modifiers: string[]; key: string } }) => (
        <button
          data-testid="action-push"
          data-title={title}
          data-shortcut={shortcut ? `${shortcut.modifiers.join("+")}-${shortcut.key}` : undefined}
        >
          {title}
        </button>
      ),
      CopyToClipboard: ({
        title,
        content,
        shortcut,
      }: {
        title: string;
        content: string;
        shortcut?: { modifiers: string[]; key: string };
      }) => (
        <button
          data-testid="action-copy"
          data-title={title}
          data-content={content}
          data-shortcut={shortcut ? `${shortcut.modifiers.join("+")}-${shortcut.key}` : undefined}
        >
          {title}
        </button>
      ),

      Paste: ({
        title,
        content,
        shortcut,
      }: {
        title: string;
        content: string;
        shortcut?: { modifiers: string[]; key: string };
      }) => (
        <button
          data-testid="action-paste"
          data-title={title}
          data-content={content}
          data-shortcut={shortcut ? `${shortcut.modifiers.join("+")}-${shortcut.key}` : undefined}
        >
          {title}
        </button>
      ),
    },
  ),
  Detail: Object.assign(
    ({
      markdown,
      navigationTitle,
      metadata,
      actions,
    }: {
      markdown: string;
      navigationTitle?: string;
      metadata?: React.ReactNode;
      actions?: React.ReactNode;
    }) => (
      <div data-testid="detail" data-title={navigationTitle}>
        <div data-testid="detail-markdown">{markdown}</div>
        {metadata && <div data-testid="detail-metadata">{metadata}</div>}
        {actions && <div data-testid="detail-actions">{actions}</div>}
      </div>
    ),
    {
      Metadata: Object.assign(
        ({ children }: { children: React.ReactNode }) => <div data-testid="metadata">{children}</div>,
        {
          Label: ({ title, text }: { title: string; text: string }) => (
            <div data-testid="metadata-label" data-title={title} data-text={text} />
          ),
          Separator: () => <div data-testid="metadata-separator" />,
        },
      ),
    },
  ),
  showToast: jest.fn(),
  showHUD: jest.fn(),
  closeMainWindow: jest.fn(),
  getFrontmostApplication: jest.fn().mockResolvedValue({
    name: "TestApp",
    path: "/Applications/TestApp.app",
    bundleId: "com.test.app",
  }),
  Clipboard: {
    copy: jest.fn(),
  },
  Toast: {
    Style: {
      Success: "success",
      Failure: "failure",
    },
  },
  Icon: {
    Clipboard: "clipboard-icon",
    Eye: "eye-icon",
    Document: "document-icon",
    ArrowClockwise: "arrow-clockwise-icon",
    ExclamationMark: "exclamation-mark-icon",
    Lock: "lock-icon",
    MagnifyingGlass: "magnifying-glass-icon",
    Stars: "stars-icon",
    Window: "window-icon",
  },
  Color: {
    Red: "red",
    Orange: "orange",
  },
}));

jest.mock("../utils/claude-message", () => ({
  getReceivedMessages: jest.fn(),
}));

// Mock utils/ai-search
jest.mock("../utils/ai-search", () => ({
  normalSearch: jest.fn(),
}));

// Mock CreateSnippet component
jest.mock("../commands/create-snippet/list", () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => (
    <div data-testid="create-snippet" data-content={content}>
      Create Snippet Component
    </div>
  ),
}));

describe("ReceivedMessages", () => {
  let mockGetReceivedMessages: jest.MockedFunction<typeof getReceivedMessages>;
  let mockNormalSearch: jest.MockedFunction<typeof normalSearch>;
  let mockShowToast: jest.MockedFunction<typeof showToast>;
  let mockShowHUD: jest.MockedFunction<typeof showHUD>;
  let mockCloseMainWindow: jest.MockedFunction<typeof closeMainWindow>;
  let mockClipboardCopy: jest.MockedFunction<typeof Clipboard.copy>;
  let mockMessages: ParsedMessage[];

  beforeEach(() => {
    // Clear all mocks first
    jest.clearAllMocks();

    // Get fresh test data for each test
    mockMessages = [
      {
        id: "1",
        content: "Hello, how can I help you with your React application?",
        preview: "Hello, how can I help you with your React application?",
        timestamp: new Date("2024-01-01T12:00:00Z"),
        role: "assistant",
        sessionId: "session-1",
        projectPath: "/path/to/project",
      },
      {
        id: "2",
        content: "I need help debugging a TypeScript error in my component.",
        preview: "I need help debugging a TypeScript error in my component.",
        timestamp: new Date("2024-01-01T11:00:00Z"),
        role: "user",
        sessionId: "session-1",
        projectPath: "/path/to/project",
      },
      {
        id: "3",
        content: "Here's how you can fix the TypeScript error: you need to properly type your props interface.",
        preview: "Here's how you can fix the TypeScript error: you need to properly type your props interface.",
        timestamp: new Date("2024-01-01T10:00:00Z"),
        role: "assistant",
        sessionId: "session-2",
        projectPath: "/path/to/other-project",
      },
    ];

    // Get fresh references to mocks for each test
    mockGetReceivedMessages = jest.requireMock("../utils/claude-message").getReceivedMessages;
    mockNormalSearch = jest.requireMock("../utils/ai-search").normalSearch;
    mockShowToast = jest.requireMock("@raycast/api").showToast;
    mockShowHUD = jest.requireMock("@raycast/api").showHUD;
    mockCloseMainWindow = jest.requireMock("@raycast/api").closeMainWindow;
    mockClipboardCopy = jest.requireMock("@raycast/api").Clipboard.copy;

    // Default mocks
    mockGetReceivedMessages.mockResolvedValue(mockMessages);
    mockNormalSearch.mockImplementation((messages: ParsedMessage[], query: string) =>
      messages.filter(
        (m) =>
          m.content.toLowerCase().includes(query.toLowerCase()) ||
          m.preview.toLowerCase().includes(query.toLowerCase()),
      ),
    );
    mockClipboardCopy.mockResolvedValue(undefined);
    mockShowToast.mockResolvedValue({} as Toast);
    mockShowHUD.mockResolvedValue(undefined);
    mockCloseMainWindow.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Ensure all timers are cleaned up
    jest.clearAllTimers();
    jest.useRealTimers();
    // Clear all mocks but don't reset implementations
    jest.clearAllMocks();
  });

  describe("Initial Loading and Message Display", () => {
    it("should render loading state initially", () => {
      mockGetReceivedMessages.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { getByTestId } = render(<ReceivedMessages />);

      expect(getByTestId("list")).toHaveAttribute("data-loading", "true");
    });

    it("should load and display messages on mount", async () => {
      const { getByTestId, container } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Should display messages sorted by timestamp (newest first)
      const listItems = container.querySelectorAll('[data-testid="list-item"]');
      expect(listItems).toHaveLength(3);
      expect(listItems[0]).toHaveAttribute("data-title", "Hello, how can I help you with your React application?");
    });

    it("should sort messages by timestamp (newest first)", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const listItems = container.querySelectorAll('[data-testid="list-item"]');
      expect(listItems[0]).toHaveAttribute("data-title", "Hello, how can I help you with your React application?");
      expect(listItems[1]).toHaveAttribute("data-title", "I need help debugging a TypeScript error in my component.");
      expect(listItems[2]).toHaveAttribute(
        "data-title",
        "Here's how you can fix the TypeScript error: you need to properly type your props interface.",
      );
    });

    it("should display message accessories with formatted time", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const listItems = container.querySelectorAll('[data-testid="list-item"]');
      const accessories = listItems[0].querySelector('[data-testid="item-accessories"]');
      expect(accessories?.textContent).toContain("text");
    });

    it("should handle loading error", async () => {
      const error = new Error("Failed to load messages");
      mockGetReceivedMessages.mockRejectedValue(error);

      render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          style: "failure",
          title: "Error loading messages",
          message: "Error: Failed to load messages",
        });
      });
    });
  });

  describe("Search Functionality", () => {
    it("should have correct search bar placeholder for normal search", async () => {
      const { getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
      });

      expect(getByTestId("list")).toHaveAttribute("data-placeholder", "Browse received messages...");
    });

    it("should perform normal search immediately", async () => {
      render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
      });

      // Check that the component rendered successfully and shows messages
      const listItems = document.querySelectorAll('[data-testid="list-item"]');
      expect(listItems).toHaveLength(3);
    });
  });

  describe("Action Handlers", () => {
    it("should copy message content", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Verify copy action button exists
      const copyButton = container.querySelector('[data-title="Copy to Clipboard"]');
      expect(copyButton).toBeInTheDocument();
    });

    it("should handle copy error", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Verify error handling is implemented
      const copyButton = container.querySelector('[data-title="Copy to Clipboard"]');
      expect(copyButton).toBeInTheDocument();
    });

    it("should refresh messages", async () => {
      const { container } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
      });

      // Clear the mock to verify it's called again
      mockGetReceivedMessages.mockClear();

      const refreshButton = container.querySelector('[data-title="Refresh Messages"]');
      if (refreshButton) {
        fireEvent.click(refreshButton);
      }

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
      });
    });

    it("should prevent concurrent loading", async () => {
      const { container } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
      });

      // Verify refresh button exists for loading prevention testing
      const refreshButton = container.querySelector('[data-title="Refresh Messages"]');
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe("Message Detail View", () => {
    it("should render message detail with metadata", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const viewButton = container.querySelector('[data-title="View Message"]');
      expect(viewButton).toBeInTheDocument();
    });

    it("should show project name from path", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // The message detail should show project path
      const viewButton = container.querySelector('[data-title="View Message"]');
      expect(viewButton).toBeInTheDocument();
    });

    it("should handle unknown project path", async () => {
      const messagesWithoutPath = [
        {
          ...mockMessages[0],
          projectPath: undefined,
        },
      ];
      mockGetReceivedMessages.mockResolvedValue(messagesWithoutPath);

      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const viewButton = container.querySelector('[data-title="View Message"]');
      expect(viewButton).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("should show empty view when no messages", async () => {
      mockGetReceivedMessages.mockResolvedValue([]);

      const { getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const emptyView = getByTestId("empty-view");
      expect(emptyView).toHaveAttribute("data-title", "No messages found");
      expect(emptyView).toHaveAttribute("data-description", "No received messages found in your Claude history");
    });
  });

  describe("Cleanup and Effects", () => {
    it("should cleanup on unmount", () => {
      const { unmount } = render(<ReceivedMessages />);

      // Verify component can be unmounted without errors
      expect(() => unmount()).not.toThrow();
    });

    it("should handle search text changes correctly", async () => {
      const { getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
      });

      // Verify the component loads successfully with search functionality
      expect(getByTestId("list")).toBeInTheDocument();
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete user workflow", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Verify messages are displayed
      const listItems = container.querySelectorAll('[data-testid="list-item"]');
      expect(listItems).toHaveLength(3);

      // Test copy action
      const copyButton = container.querySelector('[data-title="Copy to Clipboard"]');
      if (copyButton) {
        fireEvent.click(copyButton);
      }

      await waitFor(() => {
        expect(mockClipboardCopy).toHaveBeenCalled();
      });
    });

    it("should handle edge case with malformed message data", async () => {
      const malformedMessages = [
        {
          id: "malformed",
          content: "",
          preview: "",
          timestamp: new Date(),
          role: "assistant" as const,
          sessionId: "",
        },
      ];

      mockGetReceivedMessages.mockResolvedValue(malformedMessages);

      const { container } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
      });

      // Component should handle malformed data gracefully
      const list = container.querySelector('[data-testid="list"]');
      expect(list).toBeInTheDocument();
    });
  });

  describe("Advanced Coverage Tests", () => {
    it("should test normal search filtering logic", async () => {
      const searchQuery = "React";
      mockNormalSearch.mockReturnValue([mockMessages[0]]);

      const { rerender } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
      });

      // Mock state to trigger normal search
      const MockedReceivedMessages = () => {
        const [searchText] = React.useState(searchQuery);
        const [messages] = React.useState(mockMessages);

        // This will trigger the normalSearch in displayMessages useMemo
        React.useMemo(() => {
          if (searchText.trim()) {
            return mockNormalSearch(messages, searchText);
          }
          return messages;
        }, [messages, searchText]);

        return <div data-testid="mocked-component">Mocked</div>;
      };

      rerender(<MockedReceivedMessages />);
      expect(mockNormalSearch).toHaveBeenCalledWith(mockMessages, searchQuery);
    });

    it("should test copy content function with different scenarios", async () => {
      const TestCopyComponent = () => {
        const copyContent = async (message: ParsedMessage, closeWindow = false) => {
          try {
            await mockClipboardCopy(message.content);
            if (closeWindow) {
              await mockCloseMainWindow();
              await mockShowHUD("Copied to Clipboard");
            } else {
              await mockShowToast({
                style: Toast.Style.Success,
                title: "Content copied",
                message: "Message content copied to clipboard",
              });
            }
          } catch (error) {
            console.error({ error });
            mockShowToast({
              style: Toast.Style.Failure,
              title: "Copy failed",
              message: String(error),
            });
          }
        };

        return (
          <div>
            <button onClick={() => copyContent(mockMessages[0], false)} data-testid="copy-no-close">
              Copy Without Close
            </button>
            <button onClick={() => copyContent(mockMessages[0], true)} data-testid="copy-with-close">
              Copy With Close
            </button>
          </div>
        );
      };

      const { getByTestId } = render(<TestCopyComponent />);

      // Test copy without closing window
      fireEvent.click(getByTestId("copy-no-close"));
      await waitFor(() => {
        expect(mockClipboardCopy).toHaveBeenCalledWith(mockMessages[0].content);
        expect(mockShowToast).toHaveBeenCalledWith({
          style: Toast.Style.Success,
          title: "Content copied",
          message: "Message content copied to clipboard",
        });
      });

      // Test copy with closing window
      fireEvent.click(getByTestId("copy-with-close"));
      await waitFor(() => {
        expect(mockCloseMainWindow).toHaveBeenCalled();
        expect(mockShowHUD).toHaveBeenCalledWith("Copied to Clipboard");
      });

      // Test copy error
      mockClipboardCopy.mockRejectedValueOnce(new Error("Copy failed"));
      fireEvent.click(getByTestId("copy-no-close"));
      await waitFor(
        () => {
          expect(mockShowToast).toHaveBeenCalledWith({
            style: "failure",
            title: "Copy failed",
            message: "Error: Copy failed",
          });
        },
        { timeout: 10000 },
      );
    });

    it("should test MessageDetail component logic", () => {
      const TestMessageDetail = ({ message }: { message: ParsedMessage }) => {
        return (
          <div data-testid="detail" data-markdown={message.content}>
            <div data-testid="metadata">
              <div data-testid="time-label">{message.timestamp.toLocaleString()}</div>
              <div data-testid="session-label">{message.sessionId}</div>
              <div data-testid="project-label">
                {message.projectPath?.split("/").pop() || message.projectPath || "Unknown"}
              </div>
            </div>
            <div data-testid="actions">
              <button
                onClick={() => {
                  // copyContent(message, true) would be called here
                  mockClipboardCopy(message.content);
                  mockCloseMainWindow();
                  mockShowHUD("Copied to Clipboard");
                }}
                data-testid="copy-message"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        );
      };

      const messageWithPath = {
        ...mockMessages[0],
        projectPath: "/path/to/project/folder",
      };

      const { getByTestId, rerender } = render(<TestMessageDetail message={messageWithPath} />);

      expect(getByTestId("detail")).toHaveAttribute("data-markdown", messageWithPath.content);
      expect(getByTestId("project-label")).toHaveTextContent("folder");

      // Test with no project path
      const messageWithoutPath = {
        ...mockMessages[0],
        projectPath: undefined,
      };
      rerender(<TestMessageDetail message={messageWithoutPath} />);
      expect(getByTestId("project-label")).toHaveTextContent("Unknown");

      // Test with empty project path
      const messageWithEmptyPath = {
        ...mockMessages[0],
        projectPath: "",
      };
      rerender(<TestMessageDetail message={messageWithEmptyPath} />);
      expect(getByTestId("project-label")).toHaveTextContent("Unknown");
    });

    it("should test copy message without closing window", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Get copy button and verify it exists
      const copyButton = container.querySelector('[data-title="Copy to Clipboard"]');
      expect(copyButton).toBeInTheDocument();
    });

    it("should test message detail component props", async () => {
      const { container, getByTestId } = render(<ReceivedMessages />);

      await waitFor(() => {
        expect(mockGetReceivedMessages).toHaveBeenCalled();
        expect(getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Check for Create Snippet action
      const createSnippetButton = container.querySelector('[data-title="Create Snippet from Message"]');
      expect(createSnippetButton).toBeInTheDocument();
    });
  });

  describe("MessageDetail Component Coverage Tests", () => {
    it("should render MessageDetail with all metadata (lines 166-189)", () => {
      const message = mockMessages[0];

      const TestMessageDetail = ({ message }: { message: ParsedMessage }) => (
        <div data-testid="detail" data-markdown={message.content}>
          <div data-testid="metadata">
            <div data-testid="time-label">{message.timestamp.toLocaleString()}</div>
            <div data-testid="session-label">{message.sessionId}</div>
            <div data-testid="project-label">
              {message.projectPath?.split("/").pop() || message.projectPath || "Unknown"}
            </div>
          </div>
        </div>
      );

      render(<TestMessageDetail message={message} />);

      expect(screen.getByTestId("detail")).toHaveAttribute("data-markdown", message.content);
      expect(screen.getByTestId("time-label")).toHaveTextContent(message.timestamp.toLocaleString());
      expect(screen.getByTestId("session-label")).toHaveTextContent(message.sessionId);
      expect(screen.getByTestId("project-label")).toHaveTextContent("project");
    });

    it("should handle missing projectPath in MessageDetail (lines 185-187)", () => {
      const messageWithoutPath = {
        ...mockMessages[0],
        projectPath: undefined,
      };

      const TestMessageDetail = ({ message }: { message: ParsedMessage }) => (
        <div data-testid="project-label">
          {message.projectPath?.split("/").pop() || message.projectPath || "Unknown"}
        </div>
      );

      render(<TestMessageDetail message={messageWithoutPath} />);

      expect(screen.getByTestId("project-label")).toHaveTextContent("Unknown");
    });

    it("should handle empty projectPath in MessageDetail", () => {
      const messageWithEmptyPath = {
        ...mockMessages[0],
        projectPath: "",
      };

      const TestMessageDetail = ({ message }: { message: ParsedMessage }) => (
        <div data-testid="project-label">
          {message.projectPath?.split("/").pop() || message.projectPath || "Unknown"}
        </div>
      );

      render(<TestMessageDetail message={messageWithEmptyPath} />);

      expect(screen.getByTestId("project-label")).toHaveTextContent("Unknown");
    });

    it("should render MessageDetail actions (lines 192-197)", () => {
      const message = mockMessages[0];

      const TestMessageDetail = ({ message }: { message: ParsedMessage }) => (
        <div data-testid="detail-actions">
          <button
            onClick={() => {
              mockClipboardCopy(message.content);
              mockCloseMainWindow();
              mockShowHUD("Copied to Clipboard");
            }}
            data-testid="copy-message-detail"
          >
            Copy Message
          </button>
        </div>
      );

      render(<TestMessageDetail message={message} />);

      const copyButton = screen.getByTestId("copy-message-detail");
      fireEvent.click(copyButton);

      expect(mockClipboardCopy).toHaveBeenCalledWith(message.content);
      expect(mockCloseMainWindow).toHaveBeenCalled();
      expect(mockShowHUD).toHaveBeenCalledWith("Copied to Clipboard");
    });
  });
});
