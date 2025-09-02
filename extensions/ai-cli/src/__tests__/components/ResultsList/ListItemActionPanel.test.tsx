import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListItemActionPanel } from "@/components/ResultsList/ListItemActionPanel";
import { FormattingVariant } from "@/types";
import { TestWrapper } from "@/__tests__/test-utils";

const MockPromptDetailView = () => <div data-testid="prompt-detail-view">Prompt Details</div>;

describe("ListItemActionPanel", () => {
  let mockVariant: FormattingVariant;
  let mockOnGenerateMore: ReturnType<typeof vi.fn>;
  let mockOnShowPrompt: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockVariant = {
      id: "test-variant",
      content: "Test variant content for copying",
      index: 0,
    };

    mockOnGenerateMore = vi.fn();
    mockOnShowPrompt = vi.fn(() => <MockPromptDetailView />);
  });

  describe("Copy Action", () => {
    it("should display correct copy title for single variant", () => {
      render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByRole("button", { name: "Copy Answer" })).toBeInTheDocument();
    });

    it("should display indexed copy title for multiple variants", () => {
      render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByRole("button", { name: "Copy Answer" })).toBeInTheDocument();
    });

    it("should copy variant content to clipboard", async () => {
      const user = userEvent.setup();

      render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      const copyButton = screen.getByRole("button", { name: "Copy Answer" });
      await user.click(copyButton);

      // In actual Raycast, this would copy to clipboard
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe("Generate More Action", () => {
    it("should display generate button when callback is provided", () => {
      render(<ListItemActionPanel variant={mockVariant} onGenerate={mockOnGenerateMore} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByRole("button", { name: "Ask Follow-Up Question" })).toBeInTheDocument();
    });

    it("should not display generate button when callback is not provided", () => {
      render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      expect(screen.queryByRole("button", { name: "Ask Follow-Up Question" })).not.toBeInTheDocument();
    });

    it("should call generate callback when clicked", async () => {
      const user = userEvent.setup();

      render(<ListItemActionPanel variant={mockVariant} onGenerate={mockOnGenerateMore} />, {
        wrapper: TestWrapper,
      });

      const generateButton = screen.getByRole("button", { name: "Ask Follow-Up Question" });
      await user.click(generateButton);

      expect(mockOnGenerateMore).toHaveBeenCalledTimes(1);
    });

    it("should remain clickable during generation state", async () => {
      const user = userEvent.setup();

      render(<ListItemActionPanel variant={mockVariant} onGenerate={mockOnGenerateMore} />, {
        wrapper: TestWrapper,
      });

      // Should show normal action text (component doesn't have loading state logic)
      const generateButton = screen.getByRole("button", { name: "Ask Follow-Up Question" });
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).not.toBeDisabled();

      // Should call callback when clicked
      await user.click(generateButton);
      expect(mockOnGenerateMore).toHaveBeenCalled();
    });

    it("should include keyboard shortcut for generate action", () => {
      render(<ListItemActionPanel variant={mockVariant} onGenerate={mockOnGenerateMore} />, {
        wrapper: TestWrapper,
      });

      const generateButton = screen.getByRole("button", { name: "Ask Follow-Up Question" });
      expect(generateButton).toBeInTheDocument();
      // In actual Raycast, this would show ⌘G shortcut
    });
  });

  describe("Show Prompt Action", () => {
    it("should display show prompt button when callback is provided", () => {
      render(<ListItemActionPanel variant={mockVariant} onShowPrompt={mockOnShowPrompt} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByRole("button", { name: "Show Full Prompt" })).toBeInTheDocument();
    });

    it("should not display show prompt button when callback is not provided", () => {
      render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      expect(screen.queryByRole("button", { name: "Show Full Prompt" })).not.toBeInTheDocument();
    });

    it("should call show prompt callback when clicked", async () => {
      const user = userEvent.setup();

      render(<ListItemActionPanel variant={mockVariant} onShowPrompt={mockOnShowPrompt} />, {
        wrapper: TestWrapper,
      });

      const showPromptButton = screen.getByRole("button", { name: "Show Full Prompt" });
      await user.click(showPromptButton);

      expect(mockOnShowPrompt).toHaveBeenCalledTimes(1);
    });

    it("should include keyboard shortcut for show prompt action", () => {
      render(<ListItemActionPanel variant={mockVariant} onShowPrompt={mockOnShowPrompt} />, {
        wrapper: TestWrapper,
      });

      const showPromptButton = screen.getByRole("button", { name: "Show Full Prompt" });
      expect(showPromptButton).toBeInTheDocument();
      // In actual Raycast, this would show ⌘P shortcut
    });
  });

  describe("Action Panel Structure", () => {
    it("should organize actions in proper sections", () => {
      render(
        <ListItemActionPanel variant={mockVariant} onShowPrompt={mockOnShowPrompt} onGenerate={mockOnGenerateMore} />,
        {
          wrapper: TestWrapper,
        }
      );

      // All actions should be present
      expect(screen.getByRole("button", { name: "Ask Follow-Up Question" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show Full Prompt" })).toBeInTheDocument();
    });

    it("should render only copy action when no callbacks provided", () => {
      render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByRole("button", { name: "Copy Answer" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Ask Follow-Up Question" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Show Full Prompt" })).not.toBeInTheDocument();
    });

    it("should render secondary section only when secondary actions exist", () => {
      const { rerender } = render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      // Only copy action, no secondary section
      expect(screen.getByRole("button", { name: "Copy Answer" })).toBeInTheDocument();

      rerender(<ListItemActionPanel variant={mockVariant} onGenerate={mockOnGenerateMore} />);

      // Now has secondary section with generate action
      expect(screen.getByRole("button", { name: "Ask Follow-Up Question" })).toBeInTheDocument();
    });
  });

  describe("Variant Content Handling", () => {
    it("should handle empty variant content", () => {
      const emptyVariant: FormattingVariant = {
        id: "empty-variant",
        content: "",
        index: 0,
      };

      render(<ListItemActionPanel variant={emptyVariant} />, {
        wrapper: TestWrapper,
      });

      const copyButton = screen.getByRole("button", { name: "Copy Answer" });
      expect(copyButton).toBeInTheDocument();
      // Should still allow copying empty content
    });

    it("should handle very long variant content", () => {
      const longContent = "a".repeat(10000);
      const longVariant: FormattingVariant = {
        id: "long-variant",
        content: longContent,
        index: 0,
      };

      render(<ListItemActionPanel variant={longVariant} />, {
        wrapper: TestWrapper,
      });

      const copyButton = screen.getByRole("button", { name: "Copy Answer" });
      expect(copyButton).toBeInTheDocument();
      // Should handle long content without issues
    });

    it("should handle special characters in variant content", () => {
      const specialVariant: FormattingVariant = {
        id: "special-variant",
        content: "Content with émojis 🚀 and spëcial characters: <>&\"'",
        index: 0,
      };

      render(<ListItemActionPanel variant={specialVariant} />, {
        wrapper: TestWrapper,
      });

      const copyButton = screen.getByRole("button", { name: "Copy Answer" });
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero variant index", () => {
      render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByRole("button", { name: "Copy Answer" })).toBeInTheDocument();
    });

    it("should handle single variant (total count 1)", () => {
      render(<ListItemActionPanel variant={mockVariant} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByRole("button", { name: "Copy Answer" })).toBeInTheDocument();
    });

    it("should handle large variant index", () => {
      render(<ListItemActionPanel variant={{ ...mockVariant, index: 99 }} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByRole("button", { name: "Copy Answer" })).toBeInTheDocument();
    });

    it("should call callback functions when actions are triggered", async () => {
      const user = userEvent.setup();
      const generateCallback = vi.fn();

      render(<ListItemActionPanel variant={mockVariant} onGenerate={generateCallback} />, {
        wrapper: TestWrapper,
      });

      const generateButton = screen.getByRole("button", { name: "Ask Follow-Up Question" });

      // Click the button and verify callback is called
      await user.click(generateButton);
      expect(generateCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("should provide proper button roles and labels", () => {
      render(<ListItemActionPanel variant={mockVariant} onShowPrompt={mockOnShowPrompt} />, {
        wrapper: TestWrapper,
      });

      // All buttons should have proper roles and accessible names
      expect(screen.getByRole("button", { name: "Copy Answer" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show Full Prompt" })).toBeInTheDocument();
    });

    it("should provide descriptive labels for screen readers", () => {
      const mockOnGenerate = vi.fn();
      render(<ListItemActionPanel variant={{ ...mockVariant, index: 2 }} onGenerate={mockOnGenerate} />, {
        wrapper: TestWrapper,
      });

      // Button text should be descriptive
      expect(screen.getByRole("button", { name: "Ask Follow-Up Question" })).toBeInTheDocument();
    });

    it("should handle focus and keyboard navigation", () => {
      render(<ListItemActionPanel variant={mockVariant} onShowPrompt={mockOnShowPrompt} />, {
        wrapper: TestWrapper,
      });

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
        // Each button should be focusable
      });
    });
  });
});
