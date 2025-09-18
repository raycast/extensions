import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateEntityAction from "@/components/shared/CreateEntityAction";

// Mock Raycast components for behavior testing
vi.mock("@raycast/api", () => ({
  ActionPanel: ({ children }: { children: React.ReactNode }) => <div data-testid="action-panel">{children}</div>,
  Action: ({ title, onAction }: { title?: string; onAction?: () => void }) => (
    <button data-testid="create-action" onClick={onAction}>
      {title}
    </button>
  ),
  Icon: {
    Plus: "Plus",
  },
}));

describe("when user wants to create entities", () => {
  const mockOnAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    title: "Create New Template",
    onAction: mockOnAction,
  };

  describe("when user initiates entity creation", () => {
    it("triggers creation workflow when clicked", async () => {
      const user = userEvent.setup();
      render(<CreateEntityAction {...defaultProps} />);

      const createButton = screen.getByRole("button", { name: /create new template/i });
      await user.click(createButton);

      expect(mockOnAction).toHaveBeenCalledOnce();
    });

    it("supports different entity types based on title", () => {
      const { rerender } = render(<CreateEntityAction title="Create New Template" onAction={mockOnAction} />);
      expect(screen.getByRole("button", { name: /create new template/i })).toBeInTheDocument();

      rerender(<CreateEntityAction title="Create New Tone" onAction={mockOnAction} />);
      expect(screen.getByRole("button", { name: /create new tone/i })).toBeInTheDocument();
    });
  });

  describe("when user works with async operations", () => {
    it("handles async creation workflows", async () => {
      const asyncOnAction = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<CreateEntityAction title="Create Async" onAction={asyncOnAction} />);

      const createButton = screen.getByRole("button", { name: /create async/i });
      await user.click(createButton);

      await vi.waitFor(() => expect(asyncOnAction).toHaveBeenCalledOnce());
    });
  });
});
