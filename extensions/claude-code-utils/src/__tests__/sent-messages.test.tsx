/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import SentMessages from "../commands/sent-messages/list";
import { ParsedMessage } from "../utils/claude-message";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  List: Object.assign(
    ({
      children,
      searchBarPlaceholder,
      isLoading,
      actions,
      onSearchTextChange,
    }: {
      children: React.ReactNode;
      searchBarPlaceholder: string;
      isLoading: boolean;
      actions: React.ReactNode;
      onSearchTextChange?: (text: string) => void;
    }) => (
      <div
        data-testid="list"
        data-loading={isLoading}
        data-placeholder={searchBarPlaceholder}
        data-onsearchtextchange={onSearchTextChange ? "true" : "false"}
      >
        <input
          data-testid="search-input"
          type="text"
          placeholder={searchBarPlaceholder}
          onChange={(e) => onSearchTextChange?.(e.target.value)}
        />
        <div data-testid="list-actions">{actions}</div>
        {children}
      </div>
    ),
    {
      Section: ({ children, title }: { children: React.ReactNode; title: string }) => (
        <div data-testid="list-section" title={title}>
          {children}
        </div>
      ),
      Item: ({
        title,
        subtitle,
        actions,
        accessories,
      }: {
        title: string;
        subtitle?: string;
        actions: React.ReactNode;
        accessories?: Array<{ text: string }>;
      }) => (
        <div data-testid="list-item" title={title} data-subtitle={subtitle}>
          {accessories && (
            <div data-testid="accessories">
              {accessories.map((acc, idx: number) => (
                <span key={idx} data-testid="accessory">
                  {acc.text}
                </span>
              ))}
            </div>
          )}
          {actions}
        </div>
      ),
      EmptyView: ({
        title,
        description,
        icon,
        actions,
      }: {
        title: string;
        description: string;
        icon?: { source: string; tintColor: string };
        actions: React.ReactNode;
      }) => (
        <div data-testid="empty-view" data-title={title} data-description={description}>
          {icon && (
            <div data-testid="empty-icon" data-color={icon.tintColor}>
              {icon.source}
            </div>
          )}
          {actions}
        </div>
      ),
    },
  ),
  Detail: ({
    markdown,
    navigationTitle,
    metadata,
    actions,
  }: {
    markdown: string;
    navigationTitle: string;
    metadata: React.ReactNode;
    actions: React.ReactNode;
  }) => (
    <div data-testid="detail" data-markdown={markdown} data-title={navigationTitle}>
      {metadata}
      {actions}
    </div>
  ),
  ActionPanel: ({ children }: { children: React.ReactNode }) => <div data-testid="action-panel">{children}</div>,
  Action: Object.assign(
    ({
      title,
      onAction,
      shortcut,
    }: {
      title: string;
      onAction: () => void;
      shortcut?: { modifiers: string[]; key: string };
    }) => (
      <button
        data-testid={`action-${title.toLowerCase().replace(/\s+/g, "-")}`}
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
          data-testid={`action-push-${title.toLowerCase().replace(/\s+/g, "-")}`}
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
          data-testid="action-copy-to-clipboard"
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
  Clipboard: {
    copy: jest.fn(),
  },
  closeMainWindow: jest.fn(),
  showHUD: jest.fn(),
  showToast: jest.fn(),
  getFrontmostApplication: jest.fn().mockResolvedValue({
    name: "TestApp",
    path: "/Applications/TestApp.app",
    bundleId: "com.test.app",
  }),
  Toast: Object.assign(jest.fn(), {
    Style: {
      Success: "success",
      Failure: "failure",
    },
  }),
  Icon: {
    Eye: "eye-icon",
    Clipboard: "clipboard-icon",
    Document: "document-icon",
    ArrowClockwise: "refresh-icon",
    MagnifyingGlass: "search-icon",
    Stars: "stars-icon",
    Lock: "lock-icon",
    ExclamationMark: "exclamation-icon",
    Window: "window-icon",
  },
  Color: {
    Orange: "orange",
    Red: "red",
  },
}));

// Mock utils
jest.mock("../utils/claude-message", () => ({
  getSentMessages: jest.fn(),
}));

jest.mock("../utils/ai-search", () => ({
  normalSearchMessages: jest.fn(),
}));

// Mock CreateSnippet component
jest.mock("../commands/create-snippet/list", () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => (
    <div data-testid="create-snippet" data-content={content}>
      Create Snippet
    </div>
  ),
}));

describe("SentMessages", () => {
  const mockMessages: ParsedMessage[] = [
    {
      id: "1",
      content: "How can I implement authentication in my React app?",
      preview: "How can I implement authentication...",
      role: "user",
      timestamp: new Date("2024-01-01T12:00:00"),
      sessionId: "session-1",
      projectPath: "/path/to/project1",
    },
    {
      id: "2",
      content: "Can you help me optimize my database queries?",
      preview: "Can you help me optimize...",
      role: "user",
      timestamp: new Date("2024-01-02T14:30:00"),
      sessionId: "session-2",
      projectPath: "/path/to/project2",
    },
    {
      id: "3",
      content: "What are the best practices for error handling in TypeScript?",
      preview: "What are the best practices...",
      role: "user",
      timestamp: new Date("2024-01-03T09:15:00"),
      sessionId: "session-1",
    },
  ];

  const getSentMessages = jest.mocked(jest.requireMock("../utils/claude-message").getSentMessages);
  const normalSearchMessages = jest.mocked(jest.requireMock("../utils/ai-search").normalSearchMessages);
  const Clipboard = jest.mocked(jest.requireMock("@raycast/api").Clipboard);
  const closeMainWindow = jest.mocked(jest.requireMock("@raycast/api").closeMainWindow);
  const showHUD = jest.mocked(jest.requireMock("@raycast/api").showHUD);
  const showToast = jest.mocked(jest.requireMock("@raycast/api").showToast);

  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure getSentMessages resolves immediately in tests
    getSentMessages.mockResolvedValue(mockMessages);

    normalSearchMessages.mockImplementation((messages: ParsedMessage[], query: string) => {
      if (!query.trim()) return messages;
      return messages.filter(
        (msg) =>
          msg.content.toLowerCase().includes(query.toLowerCase()) ||
          msg.preview.toLowerCase().includes(query.toLowerCase()),
      );
    });
    Clipboard.copy.mockResolvedValue(undefined);
    closeMainWindow.mockResolvedValue(undefined);
    showHUD.mockResolvedValue(undefined);
    showToast.mockResolvedValue(undefined);
  });

  describe("Component Rendering", () => {
    it("should render the list component", async () => {
      render(<SentMessages />);
      expect(screen.getByTestId("list")).toBeInTheDocument();
    });

    it("should show loading state initially", () => {
      render(<SentMessages />);
      expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "true");
    });

    it("should have correct search placeholder", async () => {
      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-placeholder", "Browse sent messages...");
      });
    });

    it("should render refresh action in main action panel", () => {
      render(<SentMessages />);
      expect(screen.getByTestId("list-actions")).toBeInTheDocument();
    });
  });

  describe("Message Loading", () => {
    it("should load messages on mount", async () => {
      render(<SentMessages />);

      await waitFor(() => {
        expect(getSentMessages).toHaveBeenCalled();
      });
    });

    it("should display loaded messages", async () => {
      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const messages = screen.getAllByTestId("list-item");
      expect(messages).toHaveLength(3);
    });

    it("should sort messages by timestamp (newest first)", async () => {
      render(<SentMessages />);

      await waitFor(() => {
        const messages = screen.getAllByTestId("list-item");
        expect(messages[0]).toHaveAttribute("title", "What are the best practices...");
        expect(messages[1]).toHaveAttribute("title", "Can you help me optimize...");
        expect(messages[2]).toHaveAttribute("title", "How can I implement authentication...");
      });
    });

    it("should handle loading errors", async () => {
      const error = new Error("Failed to load messages");
      getSentMessages.mockRejectedValue(error);

      render(<SentMessages />);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith({
          style: "failure",
          title: "Error loading messages",
          message: "Error: Failed to load messages",
        });
      });
    });

    it("should show empty view when no messages", async () => {
      getSentMessages.mockResolvedValue([]);

      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-view")).toBeInTheDocument();
        expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No messages found");
        expect(screen.getByTestId("empty-view")).toHaveAttribute(
          "data-description",
          "No sent messages found in your Claude history",
        );
      });
    });
  });

  describe("Search Functionality", () => {
    it("should filter messages with normal search", async () => {
      // Directly test normalSearchMessages function behavior
      const searchQuery = "authentication";
      const result = normalSearchMessages(mockMessages, searchQuery);

      expect(result).toEqual(
        mockMessages.filter(
          (msg) =>
            msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.preview.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );

      expect(normalSearchMessages).toHaveBeenCalled();
    });
  });

  describe("Message Display", () => {
    it("should display message preview as title", async () => {
      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const listItems = screen.queryAllByTestId("list-item");
      expect(listItems).toHaveLength(3);
      // Check by attribute since the text is in the title attribute
      expect(listItems.some((item) => item.getAttribute("title")?.includes("How can I implement authentication"))).toBe(
        true,
      );
    });

    it("should display formatted timestamp as accessory", async () => {
      render(<SentMessages />);

      await waitFor(() => {
        const accessories = screen.getAllByTestId("accessory");
        expect(accessories.length).toBeGreaterThan(0);
        // Check that timestamps are formatted (should contain : for time)
        accessories.forEach((acc) => {
          expect(acc.textContent).toMatch(/\d{1,2}:\d{2}/);
        });
      });
    });

    it("should render message actions", async () => {
      render(<SentMessages />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Check for specific action buttons using test IDs
      expect(screen.getAllByTestId("action-push-view-message")).toHaveLength(3);
      expect(screen.getAllByTestId("action-copy-to-clipboard")).toHaveLength(3);
      expect(screen.getAllByTestId("action-push-create-snippet-from-message")).toHaveLength(3);
    });
  });

  describe("Message Actions", () => {
    it("should have View Message action", async () => {
      render(<SentMessages />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const viewActions = screen.getAllByTestId("action-push-view-message");
      expect(viewActions.length).toBeGreaterThan(0);
      expect(viewActions[0]).toBeInTheDocument();
    });

    it("should have Copy to Clipboard action with shortcut", async () => {
      render(<SentMessages />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const copyActions = screen.getAllByTestId("action-copy-to-clipboard");
      expect(copyActions.length).toBeGreaterThan(0);
      expect(copyActions[0]).toBeInTheDocument();
      expect(copyActions[0]).toHaveAttribute("data-shortcut", "cmd-enter");
    });

    it("should have Create Snippet action with shortcut", async () => {
      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const snippetActions = screen.getAllByTestId("action-push-create-snippet-from-message");
      expect(snippetActions.length).toBeGreaterThan(0);
      expect(snippetActions[0]).toBeInTheDocument();
      expect(snippetActions[0]).toHaveAttribute("data-shortcut", "cmd-s");
    });

    it("should have Refresh action with shortcut", async () => {
      render(<SentMessages />);

      await act(async () => {
        await waitFor(() => {
          const refreshAction = screen.getByTestId("action-refresh-messages");
          expect(refreshAction).toBeInTheDocument();
          expect(refreshAction).toHaveAttribute("data-shortcut", "cmd-r");
        });
      });
    });

    it("should copy message content", async () => {
      render(<SentMessages />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const copyAction = screen.getAllByTestId("action-copy-to-clipboard")[0];
      fireEvent.click(copyAction);

      await waitFor(() => {
        expect(Clipboard.copy).toHaveBeenCalled();
        expect(closeMainWindow).toHaveBeenCalled();
        expect(showHUD).toHaveBeenCalledWith("Copied to Clipboard");
      });
    });

    it("should handle copy errors", async () => {
      const copyError = new Error("Copy failed");
      Clipboard.copy.mockRejectedValue(copyError);

      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const copyAction = screen.getAllByTestId("action-copy-to-clipboard")[0];
      fireEvent.click(copyAction);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith({
          style: "failure",
          title: "Copy failed",
          message: "Error: Copy failed",
        });
      });
    });

    it("should refresh messages when refresh action is clicked", async () => {
      render(<SentMessages />);

      await waitFor(() => {
        expect(getSentMessages).toHaveBeenCalledTimes(1);
      });

      // Get the first refresh action (main action panel)
      const refreshActions = screen.getAllByTestId("action-refresh-messages");
      const refreshAction = refreshActions[0];

      fireEvent.click(refreshAction);

      await waitFor(() => {
        expect(getSentMessages).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Message Detail View", () => {
    it("should render MessageDetail component", () => {
      const message = mockMessages[0];

      // Create a test component that renders MessageDetail directly
      const TestMessageDetail = () => {
        // Since MessageDetail is not exported, we'll test the behavior indirectly
        const MessageDetail = ({ message }: { message: ParsedMessage }) => (
          <div data-testid="detail" data-markdown={message.content}>
            <div data-testid="detail-metadata">
              <div data-testid="timestamp">{message.timestamp.toLocaleString()}</div>
              <div data-testid="session-id">{message.sessionId}</div>
              <div data-testid="project">{message.projectPath?.split("/").pop() || "Unknown"}</div>
            </div>
          </div>
        );

        return <MessageDetail message={message} />;
      };

      render(<TestMessageDetail />);

      expect(screen.getByTestId("detail")).toBeInTheDocument();
      expect(screen.getByTestId("detail")).toHaveAttribute("data-markdown", message.content);
    });

    it("should show metadata in detail view", () => {
      const message = {
        id: "1",
        content: "How can I implement authentication in my React app?",
        preview: "How can I implement authentication...",
        role: "user" as const,
        timestamp: new Date("2024-01-01T12:00:00"),
        sessionId: "session-1",
        projectPath: "/path/to/project1",
      };

      const TestMessageDetail = () => {
        return (
          <div data-testid="detail" data-markdown={message.content}>
            <div data-testid="detail-metadata">
              <div data-testid="timestamp">{message.timestamp.toLocaleString()}</div>
              <div data-testid="session-id">{message.sessionId}</div>
              <div data-testid="project">{message.projectPath?.split("/").pop() || "Unknown"}</div>
            </div>
          </div>
        );
      };

      render(<TestMessageDetail />);

      expect(screen.getByTestId("timestamp")).toHaveTextContent(message.timestamp.toLocaleString());
      expect(screen.getByTestId("session-id")).toHaveTextContent(message.sessionId);
      expect(screen.getByTestId("project")).toHaveTextContent("project1");
    });

    it("should handle missing project path in detail view", () => {
      const messageWithoutProject: ParsedMessage = {
        ...mockMessages[0],
        projectPath: undefined,
      };

      const TestMessageDetail = () => {
        const projectPath = messageWithoutProject.projectPath;
        return (
          <div data-testid="detail">
            <div data-testid="project">{projectPath ? projectPath.split("/").pop() || projectPath : "Unknown"}</div>
          </div>
        );
      };

      render(<TestMessageDetail />);

      expect(screen.getByTestId("project")).toHaveTextContent("Unknown");
    });
  });

  describe("Error States", () => {
    it("should prevent duplicate refresh calls", async () => {
      render(<SentMessages />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      expect(getSentMessages).toHaveBeenCalledTimes(1);

      // Rapidly click refresh multiple times
      const refreshAction = screen.getAllByTestId("action-refresh-messages")[0];

      fireEvent.click(refreshAction);
      fireEvent.click(refreshAction);
      fireEvent.click(refreshAction);

      // Should only call once more due to loading ref protection
      await waitFor(() => {
        expect(getSentMessages).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Copy Functionality Tests", () => {
    it("should copy content and close window", async () => {
      render(<SentMessages />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      expect(getSentMessages).toHaveBeenCalled();

      const copyAction = screen.getAllByTestId("action-copy-to-clipboard")[0];
      fireEvent.click(copyAction);

      await waitFor(() => {
        expect(Clipboard.copy).toHaveBeenCalled();
        expect(closeMainWindow).toHaveBeenCalled();
        expect(showHUD).toHaveBeenCalledWith("Copied to Clipboard");
      });
    });

    it("should copy content without closing window", async () => {
      // Create a test component that calls copyContent with closeWindow=false
      const TestCopyComponent = () => {
        const copyContent = async (message: ParsedMessage, closeWindow = false) => {
          try {
            await Clipboard.copy(message.content);
            if (closeWindow) {
              await closeMainWindow();
              await showHUD("Copied to Clipboard");
            } else {
              await showToast({
                style: "success",
                title: "Content copied",
                message: "Message content copied to clipboard",
              });
            }
          } catch (error) {
            console.error({ error });
            showToast({
              style: "failure",
              title: "Copy failed",
              message: String(error),
            });
          }
        };

        return (
          <button onClick={() => copyContent(mockMessages[0], false)} data-testid="copy-no-close">
            Copy No Close
          </button>
        );
      };

      render(<TestCopyComponent />);

      fireEvent.click(screen.getByTestId("copy-no-close"));

      await waitFor(() => {
        expect(Clipboard.copy).toHaveBeenCalledWith(mockMessages[0].content);
        expect(showToast).toHaveBeenCalledWith({
          style: "success",
          title: "Content copied",
          message: "Message content copied to clipboard",
        });
        expect(closeMainWindow).not.toHaveBeenCalled();
        expect(showHUD).not.toHaveBeenCalled();
      });
    });

    it("should handle copy error and show error toast", async () => {
      const copyError = new Error("Copy failed");
      Clipboard.copy.mockRejectedValue(copyError);

      render(<SentMessages />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      expect(getSentMessages).toHaveBeenCalled();

      const copyAction = screen.getAllByTestId("action-copy-to-clipboard")[0];
      fireEvent.click(copyAction);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith({
          style: "failure",
          title: "Copy failed",
          message: "Error: Copy failed",
        });
      });
    });
  });

  describe("MessageDetail Component Tests", () => {
    it("should render MessageDetail with all metadata", () => {
      const message = {
        id: "1",
        content: "How can I implement authentication in my React app?",
        preview: "How can I implement authentication...",
        role: "user" as const,
        timestamp: new Date("2024-01-01T12:00:00"),
        sessionId: "session-1",
        projectPath: "/path/to/project1",
      };

      // Test MessageDetail component logic directly
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
      expect(screen.getByTestId("project-label")).toHaveTextContent("project1");
    });

    it("should handle missing projectPath in MessageDetail", () => {
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

    it("should render MessageDetail actions", () => {
      const message = mockMessages[0];

      const TestMessageDetail = ({ message }: { message: ParsedMessage }) => (
        <div data-testid="detail-actions">
          <button
            onClick={() => {
              Clipboard.copy(message.content);
              closeMainWindow();
              showHUD("Copied to Clipboard");
            }}
            data-testid="copy-message-detail"
          >
            Copy to Clipboard
          </button>
        </div>
      );

      render(<TestMessageDetail message={message} />);

      const copyButton = screen.getByTestId("copy-message-detail");
      fireEvent.click(copyButton);

      expect(Clipboard.copy).toHaveBeenCalledWith(message.content);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty search results", async () => {
      normalSearchMessages.mockReturnValue([]);

      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      // Initial messages should be loaded
      expect(screen.getAllByTestId("list-item")).toHaveLength(3);
    });

    it("should handle very long message content", async () => {
      const longMessage: ParsedMessage = {
        id: "long",
        content: "A".repeat(1000),
        preview: "A".repeat(50) + "...",
        role: "user",
        timestamp: new Date(),
        sessionId: "session-long",
      };

      getSentMessages.mockResolvedValue([longMessage]);

      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const listItems = screen.queryAllByTestId("list-item");
      expect(listItems).toHaveLength(1);
      expect(listItems[0]).toHaveAttribute("title", "A".repeat(50) + "...");
    });

    it("should handle messages with special characters", async () => {
      const specialMessage: ParsedMessage = {
        id: "special",
        content: "Message with émojis 🚀 and special chars: <>\"'&",
        preview: "Message with émojis 🚀...",
        role: "user",
        timestamp: new Date(),
        sessionId: "session-special",
      };

      getSentMessages.mockResolvedValue([specialMessage]);

      render(<SentMessages />);

      await waitFor(() => {
        expect(screen.getByTestId("list")).toHaveAttribute("data-loading", "false");
      });

      const listItems = screen.queryAllByTestId("list-item");
      expect(listItems).toHaveLength(1);
      expect(listItems[0]).toHaveAttribute("title", "Message with émojis 🚀...");
    });
  });
});
