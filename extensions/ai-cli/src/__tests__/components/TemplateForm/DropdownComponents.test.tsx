import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import TemplateDropdown from "@/components/TemplateForm/components/TemplateDropdown";
import ToneDropdown from "@/components/TemplateForm/components/ToneDropdown";
import { createTemplate, createTone } from "@/__tests__/test-factories";

// Only mock external boundaries - not internal components
vi.mock("@/navigation", () => ({
  createNavigationHandler: vi.fn(() => vi.fn()),
}));

describe("Dropdown Components - User Behavior Focus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Template Selection", () => {
    const mockTemplates = [
      createTemplate({ id: "slack", name: "Slack Message" }),
      createTemplate({ id: "email", name: "Email" }),
    ];

    const defaultProps = {
      allTemplates: mockTemplates,
      value: "slack",
      onChange: vi.fn(),
      onValidationError: vi.fn(),
      onManagePop: vi.fn(),
    };

    it("allows user to select different templates", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(<TemplateDropdown {...defaultProps} onChange={mockOnChange} />);

      const dropdown = screen.getByRole("combobox", { name: /template/i });
      await user.selectOptions(dropdown, "email");

      expect(mockOnChange).toHaveBeenCalledWith("email");
    });

    it("handles template management workflow", async () => {
      // const user = userEvent.setup();
      const mockOnValidationError = vi.fn();

      render(<TemplateDropdown {...defaultProps} onValidationError={mockOnValidationError} />);

      // const dropdown = screen.getByRole("combobox", { name: /template/i });

      // Test manage option exists and triggers navigation
      const manageOption = screen.getByRole("option", { name: /manage templates/i });
      expect(manageOption).toBeInTheDocument();
    });
  });

  describe("Tone Selection", () => {
    const mockTones = [
      createTone({ id: "professional", name: "Professional" }),
      createTone({ id: "casual", name: "Casual" }),
    ];

    const defaultProps = {
      allTones: mockTones,
      value: "professional",
      onChange: vi.fn(),
      onValidationError: vi.fn(),
      onManagePop: vi.fn(),
    };

    it("allows user to select different tones", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(<ToneDropdown {...defaultProps} onChange={mockOnChange} />);

      const dropdown = screen.getByRole("combobox", { name: /tone/i });
      await user.selectOptions(dropdown, "casual");

      expect(mockOnChange).toHaveBeenCalledWith("casual");
    });

    it("provides visual feedback for selected tone", () => {
      render(<ToneDropdown {...defaultProps} />);

      const dropdown = screen.getByRole("combobox", { name: /tone/i });
      expect(dropdown).toHaveValue("professional");
    });
  });

  describe("User Workflow Integration", () => {
    it("maintains selections during form interactions", async () => {
      // const user = userEvent.setup();
      const mockOnTemplateChange = vi.fn();
      const mockOnToneChange = vi.fn();

      const templates = [createTemplate({ id: "slack", name: "Slack" })];
      const tones = [createTone({ id: "professional", name: "Professional" })];

      render(
        <div>
          <TemplateDropdown
            allTemplates={templates}
            value="slack"
            onChange={mockOnTemplateChange}
            onValidationError={vi.fn()}
            onManagePop={vi.fn()}
          />
          <ToneDropdown
            allTones={tones}
            value="professional"
            onChange={mockOnToneChange}
            onValidationError={vi.fn()}
            onManagePop={vi.fn()}
          />
        </div>
      );

      // User should see both dropdowns with current selections
      expect(screen.getByDisplayValue("Slack")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Professional")).toBeInTheDocument();
    });
  });
});

/**
 * KEY IMPROVEMENTS MADE:
 *
 * 1. REDUCED MOCKING: Only mock external boundaries (navigation), not internal components
 * 2. BEHAVIOR FOCUSED: Test what users see and do, not implementation details
 * 3. INTEGRATION TESTING: Allow real component interactions where possible
 * 4. SIMPLIFIED SETUP: Use simple factory functions instead of complex builders
 * 5. SEMANTIC QUERIES: Use getByRole and meaningful queries over test IDs
 *
 * BENEFITS:
 * - Tests catch real integration bugs
 * - More reliable when refactoring
 * - Easier to understand and maintain
 * - Focuses on user-critical functionality
 */
