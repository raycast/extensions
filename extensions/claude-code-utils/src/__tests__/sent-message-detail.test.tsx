import { render, waitFor } from "@testing-library/react";
import MessageDetail from "../commands/sent-messages/detail";
import { ParsedMessage } from "../utils/claude-message";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  ...jest.requireActual("@raycast/api"),
  Detail: ({
    markdown,
    actions,
  }: {
    markdown: string;
    actions: React.ReactNode;
  }) => (
    <div data-testid="detail">
      <div data-testid="markdown">{markdown}</div>
      <div data-testid="actions">{actions as React.ReactNode}</div>
    </div>
  ),
  ActionPanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="action-panel">{children}</div>
  ),
  Action: {
    Paste: ({
      title,
      content,
    }: {
      title: string;
      content: string;
      icon: unknown;
      shortcut: unknown;
    }) => (
      <div
        data-testid="paste-action"
        data-title={title}
        data-content={content}
      />
    ),
    CopyToClipboard: ({
      title,
      content,
    }: {
      title: string;
      content: string;
      shortcut: unknown;
    }) => (
      <div
        data-testid="copy-action"
        data-title={title}
        data-content={content}
      />
    ),
    Push: ({
      title,
      target,
    }: {
      title: string;
      icon: unknown;
      target: React.ReactNode;
      shortcut: unknown;
    }) => (
      <div data-testid="push-action" data-title={title}>
        {target as React.ReactNode}
      </div>
    ),
  },
  Icon: {
    Document: "document-icon",
    Window: "window-icon",
  },
  getFrontmostApplication: jest.fn(),
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

const mockMessage: ParsedMessage = {
  id: "test-sent-message-1",
  content: "This is a sent message content",
  preview: "This is a sent message...",
  timestamp: new Date("2025-01-01T12:00:00Z"),
  role: "user",
  sessionId: "test-session-1",
};

describe("MessageDetail (Sent Messages)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render message content", () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockResolvedValue({
      name: "VSCode",
      path: "/Applications/VSCode.app",
    });

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    const markdown = getByTestId("markdown");
    expect(markdown.textContent).toBe(mockMessage.content);
  });

  it("should render action panel with all actions", async () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockResolvedValue({
      name: "Terminal",
      path: "/Applications/Terminal.app",
    });

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    // Wait for getFrontmostApplication to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getByTestId("paste-action")).toBeTruthy();
    expect(getByTestId("copy-action")).toBeTruthy();
    expect(getByTestId("push-action")).toBeTruthy();
  });

  it("should pass correct content to actions", async () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockResolvedValue({
      name: "VSCode",
      path: "/Applications/VSCode.app",
    });

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    // Wait for getFrontmostApplication to resolve
    await waitFor(() => {
      expect(getByTestId("paste-action")).toBeTruthy();
    });

    const pasteAction = getByTestId("paste-action");
    expect(pasteAction.getAttribute("data-content")).toBe(mockMessage.content);

    const copyAction = getByTestId("copy-action");
    expect(copyAction.getAttribute("data-content")).toBe(mockMessage.content);

    const createSnippet = getByTestId("create-snippet");
    expect(createSnippet.getAttribute("data-content")).toBe(
      mockMessage.content,
    );
  });

  it("should update frontmost app name on success", async () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockResolvedValue({
      name: "Finder",
      path: "/System/Library/CoreServices/Finder.app",
    });

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    await waitFor(() => {
      expect(getByTestId("paste-action")).toBeTruthy();
    });

    const pasteAction = getByTestId("paste-action");
    expect(pasteAction.getAttribute("data-title")).toContain("Finder");
  });

  it("should show fallback title when getFrontmostApplication fails", async () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockRejectedValue(new Error("No app found"));

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    await waitFor(() => {
      expect(getByTestId("paste-action")).toBeTruthy();
    });

    const pasteAction = getByTestId("paste-action");
    expect(pasteAction.getAttribute("data-title")).toBe("Paste to Active App");
  });
});
