import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderCopyActions,
  renderDestructiveActions,
  renderGenerateActions,
  renderManagementActions,
  renderPrimaryActions,
  renderSecondaryActions,
} from "@/components/ActionPanel/components/ActionRenderer";
import {
  CopyAction,
  DestructiveAction,
  GenerateAction,
  ManagementAction,
  PrimaryAction,
  SecondaryAction,
} from "@/types/actions";
import { Icon } from "@raycast/api";

// Use shared mock from __mocks__ directory

// Wrapper component for rendering action arrays
const ActionWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="action-wrapper">{children}</div>
);

describe("Action Renderer", () => {
  const mockOnActionExecuted = vi.fn();
  const rendererProps = { onActionExecuted: mockOnActionExecuted };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Action Workflows", () => {
    it("allows user to execute primary actions", async () => {
      const user = userEvent.setup();
      const primaryActions: PrimaryAction[] = [
        {
          id: "ask-agent",
          title: "Format Text",
          icon: Icon.Wand,
          category: "workflow",
          showWhen: "always",
          onAction: vi.fn(),
        },
      ];

      const actions = renderPrimaryActions(primaryActions, rendererProps);
      render(<ActionWrapper>{actions}</ActionWrapper>);

      const formatButton = screen.getByText("Format Text");
      await user.click(formatButton);

      expect(primaryActions[0].onAction).toHaveBeenCalled();
      expect(mockOnActionExecuted).toHaveBeenCalledWith("ask-agent");
    });

    it("allows user to copy content through copy actions", async () => {
      const user = userEvent.setup();
      const copyActions: CopyAction[] = [
        {
          id: "copy-variant",
          title: "Copy Answer",
          icon: Icon.Clipboard,
          category: "workflow",
          showWhen: "hasVariants",
          content: "Test content to copy",
        },
      ];

      const actions = renderCopyActions(copyActions, rendererProps);
      render(<ActionWrapper>{actions}</ActionWrapper>);

      const copyButton = screen.getByTestId("action-copy-clipboard");
      await user.click(copyButton);

      expect(mockOnActionExecuted).toHaveBeenCalledWith("copy-variant");
    });

    it("allows user to generate additional content", async () => {
      const user = userEvent.setup();
      const generateActions: GenerateAction[] = [
        {
          id: "generate-more",
          title: "Generate More",
          icon: Icon.Stars,
          category: "enhancement",
          showWhen: "hasVariants",
          isLoading: false,
          onAction: vi.fn(),
        },
      ];

      const actions = renderGenerateActions(generateActions, rendererProps);
      render(<ActionWrapper>{actions}</ActionWrapper>);

      const generateButton = screen.getByText("Generate More");
      await user.click(generateButton);

      expect(generateActions[0].onAction).toHaveBeenCalled();
      expect(mockOnActionExecuted).toHaveBeenCalledWith("generate-more");
    });
  });

  describe("Action State Behavior", () => {
    it("shows loading state for generate actions", () => {
      const loadingAction: GenerateAction[] = [
        {
          id: "generate-loading",
          title: "Generate More",
          icon: Icon.Stars,
          category: "enhancement",
          showWhen: "hasVariants",
          isLoading: true,
          onAction: vi.fn(),
        },
      ];

      const actions = renderGenerateActions(loadingAction, rendererProps);
      render(<ActionWrapper>{actions}</ActionWrapper>);

      expect(screen.getByText("Generate More...")).toBeInTheDocument();
    });

    it("handles navigation actions with push targets", async () => {
      const user = userEvent.setup();
      const mockComponent = <div>Mock Detail View</div>;
      const secondaryActions: SecondaryAction[] = [
        {
          id: "view-details",
          title: "View Details",
          icon: Icon.Document,
          category: "enhancement",
          showWhen: "hasFormValues",
          pushTarget: mockComponent,
        },
      ];

      const actions = renderSecondaryActions(secondaryActions, rendererProps);
      render(<ActionWrapper>{actions}</ActionWrapper>);

      const pushButton = screen.getByTestId("action-push");
      await user.click(pushButton);

      expect(mockOnActionExecuted).toHaveBeenCalledWith("view-details");
    });
  });

  describe("Destructive Action Handling", () => {
    it("handles destructive actions with confirmation", async () => {
      const user = userEvent.setup();
      const mockHandleDestructive = vi.fn();
      const destructiveActions: DestructiveAction[] = [
        {
          id: "delete-item",
          title: "Delete Item",
          icon: Icon.Trash,
          category: "destructive",
          showWhen: "always",
          confirmationTitle: "Delete Item?",
          confirmationMessage: "This cannot be undone.",
          onAction: vi.fn(),
        },
      ];

      const actions = renderDestructiveActions(destructiveActions, rendererProps, mockHandleDestructive);
      render(<ActionWrapper>{actions}</ActionWrapper>);

      const deleteButton = screen.getByText("Delete Item");
      await user.click(deleteButton);

      expect(mockHandleDestructive).toHaveBeenCalledWith(destructiveActions[0]);
      expect(mockOnActionExecuted).toHaveBeenCalledWith("delete-item");
    });
  });

  describe("Action Rendering Logic", () => {
    it("maintains consistent action execution tracking", async () => {
      const user = userEvent.setup();
      const managementAction: ManagementAction[] = [
        {
          id: "manage-templates",
          title: "Manage Templates",
          icon: Icon.Gear,
          category: "management",
          showWhen: "always",
          onAction: vi.fn(),
        },
      ];

      const actions = renderManagementActions(managementAction, rendererProps);
      render(<ActionWrapper>{actions}</ActionWrapper>);

      const manageButton = screen.getByText("Manage Templates");
      await user.click(manageButton);

      expect(managementAction[0].onAction).toHaveBeenCalled();
      expect(mockOnActionExecuted).toHaveBeenCalledWith("manage-templates");
    });
  });
});
