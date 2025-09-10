/**
 * Component Test Template
 *
 * Use this template for testing individual component behavior in isolation.
 * Focus on props → behavior relationships and user interactions.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Import the component under test
import YourComponent from "@/components/YourComponent";
import { createMockEntity } from "../test-utils";

// Mock external dependencies only
vi.mock("@raycast/api");

// Mock child components if they have complex behavior
vi.mock("@/components/ComplexChildComponent", () => ({
  default: ({ title, onAction }: { title: string; onAction: () => void }) => (
    <button data-testid="child-component" onClick={onAction}>
      {title}
    </button>
  ),
}));

describe("YourComponent", () => {
  // Define default props
  const defaultProps = {
    entities: [createMockEntity({ id: "1", name: "Entity 1" }), createMockEntity({ id: "2", name: "Entity 2" })],
    selectedId: "1",
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  describe("User Interactions", () => {
    it("allows users to select different entities", async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();

      render(<YourComponent {...defaultProps} onSelect={mockOnSelect} />);

      // User clicks on second entity
      await user.click(screen.getByText("Entity 2"));

      // Verify the callback was called correctly
      expect(mockOnSelect).toHaveBeenCalledWith("2");
    });

    it("triggers edit action when user clicks edit button", async () => {
      const user = userEvent.setup();
      const mockOnEdit = vi.fn();

      render(<YourComponent {...defaultProps} onEdit={mockOnEdit} />);

      // User clicks edit button for first entity
      await user.click(screen.getByRole("button", { name: /edit.*entity 1/i }));

      expect(mockOnEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "1", name: "Entity 1" }));
    });
  });

  describe("Conditional Rendering", () => {
    it("shows empty state when no entities provided", () => {
      render(<YourComponent {...defaultProps} entities={[]} />);

      expect(screen.getByText(/no entities found/i)).toBeInTheDocument();
    });

    it("highlights selected entity", () => {
      render(<YourComponent {...defaultProps} selectedId="2" />);

      // Focus on user-perceivable changes, not internal attributes
      const selectedEntity = screen.getByText("Entity 2").closest('[role="option"]');
      expect(selectedEntity).toHaveAttribute("aria-selected", "true");
    });

    it("shows loading state when specified", () => {
      render(<YourComponent {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe("Error States", () => {
    it("displays error message when provided", () => {
      const errorMessage = "Something went wrong";

      render(<YourComponent {...defaultProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("shows retry option when error occurs", () => {
      const mockOnRetry = vi.fn();

      render(<YourComponent {...defaultProps} error="Network error" onRetry={mockOnRetry} />);

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for interactive elements", () => {
      render(<YourComponent {...defaultProps} />);

      // Check for proper labeling
      expect(screen.getByRole("button", { name: /edit entity 1/i })).toBeInTheDocument();

      // Check for proper landmarks
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();

      render(<YourComponent {...defaultProps} onSelect={mockOnSelect} />);

      // Focus the component and use keyboard
      const firstEntity = screen.getByText("Entity 1");
      firstEntity.focus();

      await user.keyboard("{Enter}");

      expect(mockOnSelect).toHaveBeenCalledWith("1");
    });
  });
});
