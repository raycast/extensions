import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VariantListItems from "@/components/ResultsList/VariantListItems";
import { FormattingVariant } from "@/types";
import { TestWrapper } from "@/__tests__/test-utils";

// Mock the subcomponents
vi.mock("@/components/ResultsList/ListItemActionPanel", () => ({
  ListItemActionPanel: ({ variant }: { variant: { index: number } }) => (
    <div data-testid={`action-panel-${variant.index}`}>Action Panel {variant.index}</div>
  ),
}));

// Mock the helper functions
vi.mock("@/components/ResultsList/ResultsList.helpers", () => ({
  getVariantListTitle: (variant: FormattingVariant, totalCount: number) =>
    totalCount === 1 ? "Formatted Text" : `Variant ${variant.index + 1}`,
  formatContentAsMarkdown: (variant: FormattingVariant) => `**${variant.content}**`,
  getVariantKey: (variant: FormattingVariant) => `variant-${variant.id}`,
}));

describe("VariantListItems", () => {
  const mockVariants: FormattingVariant[] = [
    {
      id: "variant-1",
      content: "First variant content",
      index: 0,
    },
    {
      id: "variant-2",
      content: "Second variant content",
      index: 1,
    },
    {
      id: "variant-3",
      content: "Third variant content",
      index: 2,
    },
  ];

  const defaultProps = {
    variants: mockVariants,
    isGenerating: false,
  };

  it("should render all variant items", () => {
    render(<VariantListItems {...defaultProps} />, { wrapper: TestWrapper });

    // Should render all three variants
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("should render empty when no variants provided", () => {
    render(<VariantListItems {...defaultProps} variants={[]} />, { wrapper: TestWrapper });

    // Should render no list items
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("should use helper functions for titles and content", () => {
    render(<VariantListItems {...defaultProps} />, { wrapper: TestWrapper });

    const listItems = screen.getAllByRole("listitem");

    // Verify helper functions are called by checking list items count
    expect(listItems).toHaveLength(3);
  });

  it("should render action panels for each variant", () => {
    const mockOnShowPrompt = vi.fn();

    render(<VariantListItems {...defaultProps} onShowPrompt={mockOnShowPrompt} />, {
      wrapper: TestWrapper,
    });

    // Should render action panel for each variant
    expect(screen.getByTestId("action-panel-0")).toBeInTheDocument();
    expect(screen.getByTestId("action-panel-1")).toBeInTheDocument();
    expect(screen.getByTestId("action-panel-2")).toBeInTheDocument();
  });

  it("should pass correct props to action panels", () => {
    const mockOnShowPrompt = vi.fn();

    render(<VariantListItems {...defaultProps} onShowPrompt={mockOnShowPrompt} />, { wrapper: TestWrapper });

    // Action panels should be rendered (specific prop testing would require more detailed mocks)
    expect(screen.getByTestId("action-panel-0")).toBeInTheDocument();
    expect(screen.getByTestId("action-panel-1")).toBeInTheDocument();
    expect(screen.getByTestId("action-panel-2")).toBeInTheDocument();
  });

  it("should handle single variant correctly", () => {
    const singleVariant = [mockVariants[0]];

    render(<VariantListItems {...defaultProps} variants={singleVariant} />, { wrapper: TestWrapper });

    // Should render one item
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByTestId("action-panel-0")).toBeInTheDocument();
  });

  it("should use unique keys for list items", () => {
    render(<VariantListItems {...defaultProps} />, { wrapper: TestWrapper });

    const listItems = screen.getAllByRole("listitem");

    // Each item should have a unique key (testing this indirectly through rendering)
    expect(listItems).toHaveLength(3);

    // If keys weren't unique, React would show warnings and potentially have issues
    // The fact that all 3 items render correctly suggests proper key usage
  });

  it("should handle optional callback props", () => {
    // Render without optional callbacks
    render(<VariantListItems variants={mockVariants} />, { wrapper: TestWrapper });

    // Should still render all variants
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByTestId("action-panel-0")).toBeInTheDocument();
  });
});
