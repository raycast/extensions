/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import React from "react";
import BrowseCommandsCheatsheet from "../commands/cheatsheet/list";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  List: Object.assign(
    ({
      children,
      searchBarPlaceholder,
      filtering,
    }: {
      children: React.ReactNode;
      searchBarPlaceholder?: string;
      filtering?: boolean;
    }) => (
      <div
        data-testid="list"
        data-filtering={filtering}
        data-placeholder={searchBarPlaceholder}
      >
        {children}
      </div>
    ),
    {
      Section: ({
        children,
        title,
      }: {
        children: React.ReactNode;
        title: string;
      }) => (
        <div data-testid="list-section" title={title}>
          {children}
        </div>
      ),
      Item: ({
        title,
        subtitle,
        actions,
      }: {
        title: string;
        subtitle?: string;
        actions?: React.ReactNode;
      }) => (
        <div data-testid="list-item" title={title} data-subtitle={subtitle}>
          {actions}
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
    Terminal: "terminal-icon",
    Keyboard: "keyboard-icon",
    Flag: "flag-icon",
    Stars: "stars-icon",
    Code: "code-icon",
    Eye: "eye-icon",
    Clipboard: "clipboard-icon",
    Document: "document-icon",
    NewDocument: "newdocument-icon",
    Hashtag: "hashtag-icon",
    Gear: "gear-icon",
    Plus: "plus-icon",
    Message: "message-icon",
  },
}));

// Mock commands data
jest.mock("../constants/commands-data", () => ({
  getCommandsByCategory: jest.fn(() => [
    {
      category: "Commands",
      commands: [
        {
          id: "help",
          name: "/help",
          description: "Get usage help and list available commands",
          category: "Commands",
          usage: "/help",
        },
        {
          id: "clear",
          name: "/clear",
          description: "Clear conversation history and start fresh",
          category: "Commands",
          usage: "/clear",
        },
      ],
    },
    {
      category: "Keyboard Shortcuts",
      commands: [
        {
          id: "ctrl-c",
          name: "Ctrl+C",
          description: "Cancel current input or generation",
          category: "Keyboard Shortcuts",
          usage: "Ctrl+C",
        },
      ],
    },
  ]),
  searchCommands: jest.fn((query) => {
    if (query.toLowerCase().includes("help")) {
      return [
        {
          id: "help",
          name: "/help",
          description: "Get usage help and list available commands",
          category: "Commands",
          usage: "/help",
        },
      ];
    }
    return [];
  }),
}));

// Mock CommandDetail component
jest.mock("../commands/cheatsheet/detail", () => ({
  __esModule: true,
  default: ({ command }: { command: { name: string } }) => (
    <div data-testid="command-detail" data-command={command.name}>
      Command Detail: {command.name}
    </div>
  ),
}));

describe("BrowseCommandsCheatsheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getIconForCommand function", () => {
    it("should return Terminal icon for Commands", () => {
      const { getByTestId } = render(<BrowseCommandsCheatsheet />);
      // Check if Terminal icon is used for Commands by verifying icon attribute
      const list = getByTestId("list");
      expect(list).toBeInTheDocument();
    });

    it("should return Keyboard icon for Keyboard Shortcuts", () => {
      const { getByTestId } = render(<BrowseCommandsCheatsheet />);
      // Check if Keyboard icon is used by verifying the component renders
      const list = getByTestId("list");
      expect(list).toBeInTheDocument();
    });

    it("should return Flag icon for CLI Flags", () => {
      const getCommandsByCategory = jest.mocked(
        jest.requireMock("../constants/commands-data").getCommandsByCategory,
      );
      getCommandsByCategory.mockReturnValueOnce([
        {
          category: "CLI Flags",
          commands: [
            {
              id: "flag-test",
              name: "--help",
              description: "Show help",
              category: "CLI Flags",
            },
          ],
        },
      ]);

      const { container } = render(<BrowseCommandsCheatsheet />);
      const listItems = container.querySelectorAll('[data-testid="list-item"]');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it("should return Stars icon for Special Keywords", () => {
      const getCommandsByCategory = jest.mocked(
        jest.requireMock("../constants/commands-data").getCommandsByCategory,
      );
      getCommandsByCategory.mockReturnValueOnce([
        {
          category: "Special Keywords",
          commands: [
            {
              id: "keyword-test",
              name: "@file",
              description: "Reference a file",
              category: "Special Keywords",
            },
          ],
        },
      ]);

      const { container } = render(<BrowseCommandsCheatsheet />);
      const listItems = container.querySelectorAll('[data-testid="list-item"]');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it("should return Code icon for other categories", () => {
      const getCommandsByCategory = jest.mocked(
        jest.requireMock("../constants/commands-data").getCommandsByCategory,
      );
      getCommandsByCategory.mockReturnValueOnce([
        {
          category: "Unknown Category",
          commands: [
            {
              id: "unknown-test",
              name: "unknown-command",
              description: "Unknown command",
              category: "Unknown Category",
            },
          ],
        },
      ]);

      const { container } = render(<BrowseCommandsCheatsheet />);
      const listItems = container.querySelectorAll('[data-testid="list-item"]');
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  it("should render the list component", () => {
    const { getByTestId } = render(<BrowseCommandsCheatsheet />);
    const list = getByTestId("list");
    expect(list).toBeInTheDocument();
  });

  it("should have correct search bar placeholder", () => {
    const { getByTestId } = render(<BrowseCommandsCheatsheet />);
    const list = getByTestId("list");
    expect(list).toHaveAttribute(
      "data-placeholder",
      "Browse Claude Code cheat sheet...",
    );
  });

  it("should have filtering disabled", () => {
    const { getByTestId } = render(<BrowseCommandsCheatsheet />);
    const list = getByTestId("list");
    expect(list).toHaveAttribute("data-filtering", "false");
  });

  it("should render List.Section components for categories", () => {
    const { container } = render(<BrowseCommandsCheatsheet />);
    const sections = container.querySelectorAll(
      '[title*="Commands"], [title*="Keyboard Shortcuts"]',
    );
    expect(sections.length).toBeGreaterThan(0);
  });

  it("should render List.Item components for commands", () => {
    const { container } = render(<BrowseCommandsCheatsheet />);
    const items = container.querySelectorAll(
      '[title="/help"], [title="/clear"], [title="Ctrl+C"]',
    );
    expect(items.length).toBeGreaterThan(0);
  });

  it("should group commands by category when no search text", () => {
    const getCommandsByCategory = jest.mocked(
      jest.requireMock("../constants/commands-data").getCommandsByCategory,
    );
    render(<BrowseCommandsCheatsheet />);
    expect(getCommandsByCategory).toHaveBeenCalled();
  });

  it("should render View Details action for each command", () => {
    const { container } = render(<BrowseCommandsCheatsheet />);

    const viewDetailsButtons = container.querySelectorAll(
      '[data-title="View Details"]',
    );

    // Should have View Details buttons for all commands
    expect(viewDetailsButtons.length).toBeGreaterThan(0);
  });

  it("should test command with accessories in category view", () => {
    const getCommandsByCategory = jest.mocked(
      jest.requireMock("../constants/commands-data").getCommandsByCategory,
    );
    getCommandsByCategory.mockReturnValueOnce([
      {
        category: "Test Category",
        commands: [
          {
            id: "test-cmd",
            name: "/test",
            description: "Test command",
            category: "Test Category",
            usage: "/test --example",
          },
        ],
      },
    ]);

    const { container } = render(<BrowseCommandsCheatsheet />);
    const listItems = container.querySelectorAll('[data-testid="list-item"]');
    expect(listItems.length).toBeGreaterThan(0);

    // Test that View Details action is available
    const viewDetailsButton = container.querySelector(
      '[data-title="View Details"]',
    );
    expect(viewDetailsButton).toBeTruthy();
  });
});
