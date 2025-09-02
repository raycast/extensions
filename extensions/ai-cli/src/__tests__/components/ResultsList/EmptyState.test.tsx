import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "@/components/ResultsList/EmptyState";
import { TestWrapper } from "@/__tests__/test-utils";

describe("EmptyState", () => {
  describe("Empty State Rendering", () => {
    it("should render empty state with default message when not loading", () => {
      render(<EmptyState isLoading={false} />, { wrapper: TestWrapper });

      expect(screen.getByText("No results yet")).toBeInTheDocument();

      const emptyView = screen.getByTestId("list-empty-view");
      expect(emptyView).toHaveAttribute("data-icon", "Document");
    });

    it("should render loading state when isLoading is true", () => {
      render(<EmptyState isLoading={true} />, { wrapper: TestWrapper });

      expect(screen.getByText("Please wait...")).toBeInTheDocument();

      const emptyView = screen.getByTestId("list-empty-view");
      expect(emptyView).toHaveAttribute("data-icon", "Stars");
    });
  });

  describe("Basic Props", () => {
    it("should handle isLoading prop changes", () => {
      const { rerender } = render(<EmptyState isLoading={false} />, { wrapper: TestWrapper });

      expect(screen.getByText("No results yet")).toBeInTheDocument();

      rerender(<EmptyState isLoading={true} />);

      expect(screen.getByText("Please wait...")).toBeInTheDocument();
    });
  });
});
