/**
 * Integration Test Template
 *
 * Use this template for testing complete user workflows across multiple components.
 * Focus on user behavior and realistic scenarios.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Import the components you're testing
import YourMainComponent from "@/components/YourMainComponent";

// Mock only external dependencies (not internal logic)
vi.mock("@raycast/api");

// Mock hooks that interact with external systems
vi.mock("@/hooks/useClipboard", () => ({
  useClipboard: vi.fn(() => ({
    clipboardText: "Sample clipboard content",
    isLoading: false,
  })),
}));

describe("Complete User Workflow: [Describe end-to-end scenario]", () => {
  describe("Happy Path", () => {
    it("user completes text formatting and copies result", async () => {
      const user = userEvent.setup();

      // Setup: User has content in clipboard
      const { setupSuccessfulProcessing, setupClipboardWithContent } = setupIntegrationMocks();
      setupClipboardWithContent("Hello world");
      setupSuccessfulProcessing();

      // Render the main form
      const mockNavigateToResults = vi.fn();
      render(<TemplateForm onSubmit={mockNavigateToResults} />);

      // User selects format and tone, then submits
      await userInteractions.fillFormAndSubmit(user, {
        textInput: "Hello world",
        format: "slack",
        tone: "professional",
      });

      // Verify user navigates to results
      await waitFor(() => {
        expect(mockNavigateToResults).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ content: expect.any(String) })]),
          "Slack",
          expect.any(Object),
          "Hello world"
        );
      });

      // Verify user sees success feedback
      expect(screen.getByText(/formatted.*successfully/i)).toBeInTheDocument();
    });
  });

  describe("Error Recovery Workflows", () => {
    it("user recovers from Claude unavailable error", async () => {
      const user = userEvent.setup();

      // Setup failure then recovery
      const { setupProcessingError, setupSuccessfulProcessing } = setupIntegrationMocks();
      setupProcessingError(new Error("Claude executable not found"));

      render(<TemplateForm onSubmit={vi.fn()} />);

      // User attempts formatting
      await userInteractions.fillFormAndSubmit(user);

      // User sees error and guidance
      await waitFor(() => {
        expect(screen.getByText(/claude.*not found/i)).toBeInTheDocument();
        expect(screen.getByText(/check preferences/i)).toBeInTheDocument();
      });

      // User retries after fix
      setupSuccessfulProcessing();
      await user.click(screen.getByRole("button", { name: /retry/i }));

      // Verify success
      await waitFor(() => {
        expect(screen.getByText(/formatted successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility & Keyboard Navigation", () => {
    it("supports complete keyboard workflow", async () => {
      const user = userEvent.setup();
      const { setupSuccessfulProcessing } = setupIntegrationMocks();
      setupSuccessfulProcessing();

      render(<TemplateForm onSubmit={vi.fn()} />);

      // Tab through all interactive elements
      await user.tab();
      expect(screen.getByLabelText(/text/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/format/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/tone/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: /format.*text/i })).toHaveFocus();

      // Submit using Enter key
      await user.keyboard("{Enter}");

      // Verify form submission worked
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });
    });
  });

  describe("Cross-Component Integration", () => {
    it("passes data correctly between components", async () => {
      const user = userEvent.setup();

      render(<YourMainComponent onSubmit={vi.fn()} />);

      // Action in first component
      await user.selectOptions(screen.getByLabelText(/format/i), "slack");

      // Verify it affects second component
      expect(screen.getByText(/slack preview/i)).toBeInTheDocument();
    });
  });
});
