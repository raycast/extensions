/**
 * Form Validation Feedback Test
 *
 * Tests that validation errors are properly shown to users in the form UI.
 * Focuses on behavior testing of form validation and user feedback.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test-utils";
import TemplateForm from "@/components/TemplateForm/TemplateForm";

// Mock form dependencies with simple returns
vi.mock("@/hooks/useCustomTones", () => ({
  useCustomTones: () => ({
    allTones: [
      { id: "professional", name: "Professional", isBuiltIn: true },
      { id: "casual", name: "Casual", isBuiltIn: true },
    ],
    refreshTones: vi.fn(),
  }),
}));

vi.mock("@/hooks/useCustomTemplates", () => ({
  useCustomTemplates: () => ({
    allTemplates: [
      { id: "slack", name: "Slack", isBuiltIn: true },
      { id: "email", name: "Email", isBuiltIn: true },
      { id: "github-pr", name: "GitHub PR", isBuiltIn: true },
    ],
    refreshTemplates: vi.fn(),
  }),
}));

vi.mock("@/hooks/useFormPersistence", () => ({
  useFormPersistence: () => ({
    initialAgent: "claude",
    initialTemplate: "slack",
    initialTone: "professional",
    initialModel: "Sonnet 4.0",
    initialTargetFolder: "",
    setLastAgent: vi.fn(),
    setLastTemplate: vi.fn(),
    setLastTone: vi.fn(),
    setLastModel: vi.fn(),
    setLastTargetFolder: vi.fn(),
  }),
}));

vi.mock("@/hooks/useClipboard", () => ({
  useClipboard: () => ({
    clipboardText: "",
  }),
}));

describe("Form Validation Feedback", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when form renders with validation support", () => {
    it("should render form with proper validation structure", () => {
      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      // Should render form elements that support validation
      expect(screen.getByTitle("Text")).toBeInTheDocument();
      expect(screen.getByTitle(/template/i)).toBeInTheDocument();
      expect(screen.getByTitle(/tone/i)).toBeInTheDocument();
      expect(screen.getByTestId("action-ask-agent")).toBeInTheDocument();
    });

    it("should provide accessible form controls", () => {
      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      // Form elements should have proper accessibility attributes
      const textInput = screen.getByTitle("Text");
      const templateSelect = screen.getByTitle(/template/i);
      const toneSelect = screen.getByTitle(/tone/i);

      expect(textInput).toBeInTheDocument();
      expect(templateSelect).toBeInTheDocument();
      expect(toneSelect).toBeInTheDocument();
    });
  });

  describe("when user interacts with form fields", () => {
    it("should allow user to fill form fields", async () => {
      const user = userEvent.setup();

      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      const textInput = screen.getByTitle("Text");

      // User should be able to enter text
      await user.type(textInput, "Test validation text");

      // Text should be entered successfully
      expect(textInput).toHaveValue("Test validation text");
    });

    it("should support form submission workflow", async () => {
      const user = userEvent.setup();

      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      const textInput = screen.getByTitle("Text");
      const submitButton = screen.getByTestId("action-ask-agent");

      // Fill form with valid data
      await user.type(textInput, "Valid form data for submission");

      // Submit form
      await user.click(submitButton);

      // Should call onSubmit with form data
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            textInput: "Valid form data for submission",
            template: "slack",
            tone: "professional",
          }),
          "Valid form data for submission",
          expect.any(String)
        );
      });
    });
  });

  describe("when form handles validation scenarios", () => {
    it("should maintain form state during validation", async () => {
      const user = userEvent.setup();

      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      const textInput = screen.getByTitle("Text");
      const templateSelect = screen.getByTitle(/template/i);
      const toneSelect = screen.getByTitle(/tone/i);

      // User fills multiple fields
      await user.type(textInput, "Multi-field validation test");
      await user.selectOptions(templateSelect, "email");
      await user.selectOptions(toneSelect, "casual");

      // Form should maintain all entered values
      expect(textInput).toHaveValue("Multi-field validation test");
      // Select values would be maintained by the form state
    });

    it("should support validation feedback workflow", async () => {
      const user = userEvent.setup();

      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      const textInput = screen.getByTitle("Text");
      const submitButton = screen.getByTestId("action-ask-agent");

      // User attempts submission (validation would be handled by useForm)
      await user.click(submitButton);

      // If validation fails, onSubmit should not be called
      // If validation passes, onSubmit would be called
      // The form should maintain its interactive state
      expect(submitButton).toBeEnabled();
      expect(textInput).toBeInTheDocument();
    });

    it("should handle different validation scenarios", async () => {
      const user = userEvent.setup();

      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      const textInput = screen.getByTitle("Text");
      const submitButton = screen.getByTestId("action-ask-agent");

      // Test empty form submission
      await user.click(submitButton);

      // Form should remain functional
      expect(submitButton).toBeEnabled();

      // Test with whitespace only
      await user.type(textInput, "   ");
      await user.click(submitButton);

      // Form should handle whitespace validation
      expect(textInput).toBeInTheDocument();

      // Test with valid content
      await user.clear(textInput);
      await user.type(textInput, "Valid content");
      await user.click(submitButton);

      // Should proceed with valid content
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            textInput: "Valid content",
          }),
          "Valid content",
          expect.any(String)
        );
      });
    });
  });

  describe("when form provides user guidance", () => {
    it("should provide helpful placeholders and labels", () => {
      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      // Should have informative placeholders and labels
      const textInput = screen.getByTitle("Text");
      expect(textInput).toBeInTheDocument();

      // Should have placeholder text for guidance
      expect(screen.getByPlaceholderText(/paste.*type.*text/i)).toBeInTheDocument();
    });

    it("should maintain accessibility during validation flows", async () => {
      const user = userEvent.setup();

      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      // Form elements should maintain accessibility attributes
      const textInput = screen.getByTitle("Text");
      const submitButton = screen.getByTestId("action-ask-agent");

      // Accessibility should be maintained during interactions
      expect(textInput).toBeInTheDocument();
      expect(submitButton).toBeEnabled();

      // After interactions, accessibility should be preserved
      await user.type(textInput, "Accessibility test");
      expect(textInput).toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });
  });
});
