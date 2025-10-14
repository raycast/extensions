/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import CommandDetail from "../commands/browse-commands/detail";
import { SlashCommand } from "../utils/command";

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

describe("SlashCommandDetail", () => {
  const mockCommand: SlashCommand = {
    id: "test-command",
    name: "Test Command",
    content: "# Test Command\n\nThis is a test command.",
    filePath: "/path/to/test-command.md",
  };

  it("should render command detail", () => {
    render(<CommandDetail command={mockCommand} />);

    const detail = screen.getByTestId("detail");
    expect(detail).toBeInTheDocument();
  });

  it("should display command name in navigation title", () => {
    render(<CommandDetail command={mockCommand} />);

    const detail = screen.getByTestId("detail");
    expect(detail).toHaveAttribute("data-navigation-title", "Test Command");
  });

  it("should include command name and content in markdown", () => {
    render(<CommandDetail command={mockCommand} />);

    const detail = screen.getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");

    expect(markdown).toContain("# Test Command");
    expect(markdown).toContain("```markdown"); // Code block wrapper
    expect(markdown).toContain("This is a test command.");
  });

  it("should render paste action as primary", async () => {
    render(<CommandDetail command={mockCommand} />);

    // Wait for getFrontmostApplication to resolve
    await screen.findByTestId("action-paste");

    const pasteAction = screen.getByTestId("action-paste");
    expect(pasteAction).toBeInTheDocument();
    expect(pasteAction).toHaveAttribute("data-title", "Paste to Test App");
    expect(pasteAction).toHaveAttribute("data-content", "/" + mockCommand.name);
  });

  it("should render copy to clipboard action with cmd+enter", () => {
    render(<CommandDetail command={mockCommand} />);

    const copyAction = screen.getByTestId("action-copy");
    expect(copyAction).toBeInTheDocument();
    expect(copyAction).toHaveAttribute("data-title", "Copy to Clipboard");
  });

  it("should render show in finder action", () => {
    render(<CommandDetail command={mockCommand} />);

    expect(screen.getByTestId("action-show-finder")).toBeInTheDocument();
  });

  it("should render open with action", () => {
    render(<CommandDetail command={mockCommand} />);

    expect(screen.getByTestId("action-open-with")).toBeInTheDocument();
  });

  it("should handle special characters in command content", () => {
    const specialCommand: SlashCommand = {
      id: "special-command",
      name: "Special Command",
      content: "# Special\n\n`code` & <tags> $variables",
      filePath: "/path/to/special-command.md",
    };

    render(<CommandDetail command={specialCommand} />);

    const detail = screen.getByTestId("detail");
    const markdown = detail.getAttribute("data-markdown");

    expect(markdown).toContain("`code` & <tags> $variables");
  });
});
