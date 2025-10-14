/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AgentDetail from "../commands/browse-agents/detail";
import { Agent } from "../utils/agent";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  Detail: ({
    markdown,
    navigationTitle,
    actions,
  }: {
    markdown: string;
    navigationTitle: string;
    actions: React.ReactNode;
  }) => (
    <div
      data-testid="detail"
      data-markdown={markdown}
      data-navigation-title={navigationTitle}
    >
      {actions}
    </div>
  ),
  ActionPanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="action-panel">{children}</div>
  ),
  Action: {
    Paste: ({ title, content }: { title: string; content: string }) => (
      <button
        data-testid="action-paste"
        data-title={title}
        data-content={content}
      >
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
    Clipboard: "clipboard-icon",
    Window: "window-icon",
  },
  getFrontmostApplication: jest.fn().mockResolvedValue({
    name: "Test App",
    path: "/Applications/Test.app",
  }),
}));

describe("AgentDetail", () => {
  const mockAgent: Agent = {
    id: "test-agent",
    name: "Test Agent",
    content: "# Test Agent\n\nThis is a test agent.",
    filePath: "/path/to/test-agent.md",
  };

  it("should render agent detail", () => {
    render(<AgentDetail agent={mockAgent} />);

    const detail = screen.getByTestId("detail");
    expect(detail).toBeInTheDocument();
  });

  it("should display agent name in navigation title", () => {
    render(<AgentDetail agent={mockAgent} />);

    const detail = screen.getByTestId("detail");
    expect(detail).toHaveAttribute("data-navigation-title", "Test Agent");
  });

  it("should include agent name and content in markdown", () => {
    render(<AgentDetail agent={mockAgent} />);

    const detail = screen.getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");

    expect(markdown).toContain("# Test Agent");
    expect(markdown).toContain("```markdown"); // Code block wrapper
    expect(markdown).toContain("This is a test agent.");
  });

  it("should render paste action as primary", async () => {
    render(<AgentDetail agent={mockAgent} />);

    // Wait for getFrontmostApplication to resolve
    await screen.findByTestId("action-paste");

    const pasteAction = screen.getByTestId("action-paste");
    expect(pasteAction).toBeInTheDocument();
    expect(pasteAction).toHaveAttribute("data-title", "Paste to Test App");
    expect(pasteAction).toHaveAttribute("data-content", "/" + mockAgent.name);
  });

  it("should render copy to clipboard action with cmd+enter", () => {
    render(<AgentDetail agent={mockAgent} />);

    const copyAction = screen.getByTestId("action-copy");
    expect(copyAction).toBeInTheDocument();
    expect(copyAction).toHaveAttribute("data-title", "Copy to Clipboard");
  });

  it("should render show in finder action", () => {
    render(<AgentDetail agent={mockAgent} />);

    expect(screen.getByTestId("action-show-finder")).toBeInTheDocument();
  });

  it("should render open with action", () => {
    render(<AgentDetail agent={mockAgent} />);

    expect(screen.getByTestId("action-open-with")).toBeInTheDocument();
  });

  it("should handle special characters in agent content", () => {
    const specialAgent: Agent = {
      id: "special-agent",
      name: "Special Agent",
      content: "# Special\n\n`code` & <tags> $variables",
      filePath: "/path/to/special-agent.md",
    };

    render(<AgentDetail agent={specialAgent} />);

    const detail = screen.getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");

    expect(markdown).toContain("`code` & <tags> $variables");
  });
});
