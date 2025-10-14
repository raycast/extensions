/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CommandDetail from "../commands/cheatsheet/detail";
import { CommandItem } from "../constants/commands-data";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  Detail: ({
    markdown,
    actions,
  }: {
    markdown: string;
    actions: React.ReactNode;
  }) => (
    <div data-testid="detail" data-markdown={markdown}>
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
    CopyToClipboard: ({
      title,
      content,
    }: {
      title: string;
      content: string;
    }) => (
      <button
        data-testid="action-copy"
        data-title={title}
        data-content={content}
      >
        {title}
      </button>
    ),
  },
  Icon: {
    Clipboard: "clipboard-icon",
    Code: "code-icon",
    Document: "document-icon",
    Window: "window-icon",
  },
  getFrontmostApplication: jest.fn().mockResolvedValue({
    name: "Test App",
    path: "/Applications/Test.app",
  }),
}));

describe("CommandDetail", () => {
  const mockCommand: CommandItem = {
    id: "help",
    name: "/help",
    description: "Get usage help and list available commands",
    category: "Commands",
    usage: "/help",
    examples: ["/help", "/help commands"],
  };

  const mockCommandWithoutOptional: CommandItem = {
    id: "clear",
    name: "/clear",
    description: "Clear conversation history",
    category: "Commands",
  };

  it("should render the detail component", () => {
    const { getByTestId } = render(<CommandDetail command={mockCommand} />);
    const detail = getByTestId("detail");
    expect(detail).toBeInTheDocument();
  });

  it("should include command name in markdown", () => {
    const { getByTestId } = render(<CommandDetail command={mockCommand} />);
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).toContain("# /help");
  });

  it("should include description in markdown", () => {
    const { getByTestId } = render(<CommandDetail command={mockCommand} />);
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).toContain("**Description:**");
    expect(markdown).toContain("Get usage help and list available commands");
  });

  it("should show usage before description when both are present", () => {
    const { getByTestId } = render(<CommandDetail command={mockCommand} />);
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown") || "";

    const usageIndex = markdown.indexOf("**Usage:**");
    const descriptionIndex = markdown.indexOf("**Description:**");

    expect(usageIndex).toBeGreaterThan(-1);
    expect(descriptionIndex).toBeGreaterThan(-1);
    expect(usageIndex).toBeLessThan(descriptionIndex);
  });

  it("should include usage when provided", () => {
    const { getByTestId } = render(<CommandDetail command={mockCommand} />);
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).toContain("**Usage:**");
    expect(markdown).toContain("/help");
  });

  it("should include examples when provided", () => {
    const { getByTestId } = render(<CommandDetail command={mockCommand} />);
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).toContain("**Examples:**");
    expect(markdown).toContain("/help commands");
  });

  it("should not include usage section when not provided", () => {
    const { getByTestId } = render(
      <CommandDetail command={mockCommandWithoutOptional} />,
    );
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).not.toContain("**Usage:**");
  });

  it("should not include examples section when not provided", () => {
    const { getByTestId } = render(
      <CommandDetail command={mockCommandWithoutOptional} />,
    );
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).not.toContain("**Examples:**");
  });

  it("should render paste action as primary", async () => {
    render(<CommandDetail command={mockCommand} />);

    // Wait for getFrontmostApplication to resolve
    const pasteAction = await screen.findByTestId("action-paste");

    expect(pasteAction).toBeInTheDocument();
    expect(pasteAction).toHaveAttribute("data-title", "Paste to Test App");
    expect(pasteAction).toHaveAttribute("data-content", "/help");
  });

  it("should handle commands with special characters", () => {
    const specialCommand: CommandItem = {
      id: "ctrl-c",
      name: "Ctrl+C",
      description: "Cancel current input",
      category: "Keyboard Shortcuts",
      usage: "Ctrl+C",
    };

    const { getByTestId } = render(<CommandDetail command={specialCommand} />);
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).toContain("# Ctrl+C");
    expect(markdown).toContain("Ctrl+C");
  });

  it("should format markdown with code blocks for usage", () => {
    const { getByTestId } = render(<CommandDetail command={mockCommand} />);
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).toContain("```markdown");
    expect(markdown).toContain("```");
  });

  it("should handle multiple examples", () => {
    const multiExampleCommand: CommandItem = {
      id: "test",
      name: "test-command",
      description: "Test command",
      category: "Test",
      examples: ["example1", "example2", "example3"],
    };

    const { getByTestId } = render(
      <CommandDetail command={multiExampleCommand} />,
    );
    const detail = getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");
    expect(markdown).toContain("example1");
    expect(markdown).toContain("example2");
    expect(markdown).toContain("example3");
  });
});
