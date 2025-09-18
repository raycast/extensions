import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormActions from "@/components/TemplateForm/components/FormActions";

// Mock the context and hooks that FormActions depends on
vi.mock("@/contexts/PromptActionContext", () => ({
  usePromptActionContext: vi.fn(() => ({})),
}));

vi.mock("@/hooks/usePromptActions", () => ({
  usePromptActions: vi.fn(() => ({
    createShowPromptHandler: vi.fn(() => vi.fn()),
  })),
}));

vi.mock("@/components/shared/utils/action-builders", () => ({
  createFormActionContext: vi.fn((hasFormValues, isProcessing, showAdvanced) => ({
    hasFormValues,
    isProcessing,
    showAdvanced,
  })),
  createFormActionGroups: vi.fn((onSubmit) => [
    {
      actions: [
        {
          id: "ask-agent",
          onAction: onSubmit,
        },
      ],
    },
  ]),
}));

vi.mock("@/components/ActionPanel/StandardActionPanel", () => ({
  default: vi.fn(({ context, actions, onActionExecuted }) => (
    <div data-testid="action-panel">
      {!context?.isProcessing && (
        <button
          data-testid="template-action"
          onClick={() => {
            // Simulate the action execution
            actions[0]?.actions?.[0]?.onAction?.();
            onActionExecuted?.("ask-agent");
          }}
        >
          Format Text
        </button>
      )}
    </div>
  )),
}));

describe("TemplateForm", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Form Actions", () => {
    it("submits form when user clicks format button", async () => {
      const user = userEvent.setup();

      render(<FormActions isProcessing={false} onSubmit={mockOnSubmit} />);

      const templateButton = screen.getByTestId("template-action");
      await user.click(templateButton);

      expect(mockOnSubmit).toHaveBeenCalledOnce();
    });

    it("disables actions during processing", () => {
      render(<FormActions isProcessing={true} onSubmit={mockOnSubmit} />);

      expect(screen.queryByTestId("template-action")).not.toBeInTheDocument();
    });
  });
});
