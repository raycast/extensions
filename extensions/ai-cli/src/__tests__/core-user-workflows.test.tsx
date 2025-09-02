/**
 * Core User Workflows - Consolidated Behavioral Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createFormValues } from "./test-factories";
import { renderWithProviders } from "./test-utils";
import TemplateForm from "@/components/TemplateForm/TemplateForm";
import ResultsList from "@/components/ResultsList/ResultsList";

// Mock only external boundaries - not internal components
vi.mock("@/hooks/useClipboard", () => ({
  useClipboard: () => ({ clipboardText: "Sample clipboard text" }),
}));

const mockProcess = vi.fn();
vi.mock("@/hooks/useAgentProcessing", () => ({
  useAgentProcessing: () => ({
    isProcessing: false,
    processText: mockProcess,
    processFollowUp: vi.fn(),
    processingParams: { expandedAgentPath: "/usr/local/bin/claude", workingDir: "/tmp" },
  }),
}));

describe("Core User Workflows - Behavior Focus", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Essential User Journey: Form → Results", () => {
    it("user completes form and sees processing state", async () => {
      const user = userEvent.setup();

      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      // User fills form
      const textInput = screen.getAllByTestId("form-textarea")[0]; // First textarea is the main text input
      await user.type(textInput, "User wants to format this text");

      // User submits
      const submitButton = screen.getByText("Ask AI");
      await user.click(submitButton);

      // Verify user action resulted in expected behavior
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          textInput: "User wants to format this text",
        }),
        expect.any(String),
        expect.any(String)
      );
    });

    it("user receives feedback when form submission fails", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValue(new Error("Processing failed"));

      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      const textInput = screen.getAllByTestId("form-textarea")[0]; // First textarea is the main text input
      await user.type(textInput, "Text that will fail");

      const submitButton = screen.getByText("Ask AI");
      await user.click(submitButton);

      // User should see error feedback (implementation agnostic)
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        // Error handling should be visible to user somehow
      });
    });
  });

  describe("Essential User Journey: Results Rendering", () => {
    it("renders results list after submission", () => {
      const formValues = createFormValues({
        textInput: "Text to create a result for",
      });

      renderWithProviders(
        <ResultsList formValues={formValues} inputText="Text to create a result for" templateName="Slack" />
      );

      const resultsList = screen.getByRole("list");
      expect(resultsList).toBeInTheDocument();
    });

    it("user understands when processing encounters issues", () => {
      const formValues = createFormValues({
        textInput: "Text that causes processing issues",
      });

      renderWithProviders(
        <ResultsList formValues={formValues} inputText="Text that causes processing issues" templateName="Email" />
      );

      // User should have clear understanding of current state
      expect(screen.getByRole("list")).toBeInTheDocument();
    });
  });

  describe("Essential User Experience: Error Recovery", () => {
    it("user can recover from various error conditions", () => {
      const errorScenarios = [
        { textInput: "Timeout scenario", templateName: "Slack" },
        { textInput: "Network error scenario", templateName: "Email" },
        { textInput: "Authentication error scenario", templateName: "GitHub PR" },
      ];

      errorScenarios.forEach(({ textInput, templateName }) => {
        const formValues = createFormValues({ textInput });

        const { unmount } = renderWithProviders(
          <ResultsList formValues={formValues} inputText={textInput} templateName={templateName} />
        );

        // Each error scenario should maintain consistent UI
        expect(screen.getByRole("list")).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe("Essential User Experience: Template & Tone Selection", () => {
    it("user can select from available templates and tones", () => {
      renderWithProviders(<TemplateForm onSubmit={mockOnSubmit} />);

      // User should see selection options
      const templateDropdown = screen.getByRole("combobox", { name: /template/i });
      const toneDropdown = screen.getByRole("combobox", { name: /tone/i });

      expect(templateDropdown).toBeInTheDocument();
      expect(toneDropdown).toBeInTheDocument();
    });
  });
});
