import { render, waitFor } from "@testing-library/react";
import MessageDetail from "../commands/received-messages/detail";
import { ParsedMessage } from "../utils/claude-message";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  ...jest.requireActual("@raycast/api"),
  Detail: ({ markdown, actions }: { markdown: string; actions: React.ReactNode }) => (
    <div data-testid="detail">
      <div data-testid="markdown">{markdown}</div>
      <div data-testid="actions">{actions as React.ReactNode}</div>
    </div>
  ),
  ActionPanel: ({ children }: { children: React.ReactNode }) => <div data-testid="action-panel">{children}</div>,
  Action: {
    Paste: ({ title, content }: { title: string; content: string; icon: unknown; shortcut: unknown }) => (
      <div data-testid="paste-action" data-title={title} data-content={content} />
    ),
    CopyToClipboard: ({ title, content }: { title: string; content: string; shortcut: unknown }) => (
      <div data-testid="copy-action" data-title={title} data-content={content} />
    ),
    Push: ({ title, target }: { title: string; icon: unknown; target: React.ReactNode; shortcut: unknown }) => (
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
  id: "test-message-1",
  content: "This is a test message content",
  preview: "This is a test message...",
  timestamp: new Date("2025-01-01T12:00:00Z"),
  role: "assistant",
  sessionId: "test-session-1",
};

describe("MessageDetail (Received Messages)", () => {
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

  it("should render action panel with paste action", async () => {
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
    expect(pasteAction).toBeTruthy();
    expect(pasteAction.getAttribute("data-content")).toBe(mockMessage.content);
  });

  it("should render copy to clipboard action", () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockResolvedValue({
      name: "VSCode",
      path: "/Applications/VSCode.app",
    });

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    const copyAction = getByTestId("copy-action");
    expect(copyAction).toBeTruthy();
    expect(copyAction.getAttribute("data-title")).toBe("Copy to Clipboard");
    expect(copyAction.getAttribute("data-content")).toBe(mockMessage.content);
  });

  it("should render create snippet action", () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockResolvedValue({
      name: "VSCode",
      path: "/Applications/VSCode.app",
    });

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    const pushAction = getByTestId("push-action");
    expect(pushAction).toBeTruthy();
    expect(pushAction.getAttribute("data-title")).toBe("Create Snippet");

    const createSnippet = getByTestId("create-snippet");
    expect(createSnippet).toBeTruthy();
    expect(createSnippet.getAttribute("data-content")).toBe(mockMessage.content);
  });

  it("should handle getFrontmostApplication success", async () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockResolvedValue({
      name: "Chrome",
      path: "/Applications/Chrome.app",
    });

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    // Wait for useEffect to complete
    await waitFor(() => {
      expect(getByTestId("paste-action")).toBeTruthy();
    });

    const pasteAction = getByTestId("paste-action");
    expect(pasteAction.getAttribute("data-title")).toContain("Chrome");
  });

  it("should handle getFrontmostApplication error", async () => {
    const { getFrontmostApplication } = jest.requireMock("@raycast/api");
    getFrontmostApplication.mockRejectedValue(new Error("Failed to get app"));

    const { getByTestId } = render(<MessageDetail message={mockMessage} />);

    // Wait for useEffect to complete
    await waitFor(() => {
      expect(getByTestId("paste-action")).toBeTruthy();
    });

    // When getFrontmostApplication fails, paste action still renders with fallback title
    const pasteAction = getByTestId("paste-action");
    expect(pasteAction.getAttribute("data-title")).toBe("Paste to Active App");
  });
});
