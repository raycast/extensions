import { describe, expect, it, vi } from "vitest";
import { Icon, Keyboard } from "@raycast/api";
import {
  createAskAgentAction,
  createFormActionGroups,
  createGenerateVariantAction,
  createVariantCopyActions,
  createViewPromptAction,
} from "@/components/shared/utils/action-builders";

// Mock locale messages
vi.mock("../../locale/en/messages", () => ({
  messages: {
    actions: {
      showFullPrompt: "Show Full Prompt",
      formatText: "Format Text",
      generateAdditionalVariant: "Generate Additional Variant",
      copyAnswer: "Copy Answer",
      copyAnswerNumber: "Copy Answer {number}",
      copyAllVariants: "Copy All Variants",
    },
  },
}));

describe("action-builders", () => {
  describe("User Workflow Actions", () => {
    it("creates ask agent action for user workflows", () => {
      const mockOnSubmit = vi.fn();
      const action = createAskAgentAction(mockOnSubmit);

      expect(action).toEqual({
        id: "ask-agent",
        title: "Format Text",
        icon: Icon.Wand,
        category: "workflow",
        showWhen: "always",
        onAction: mockOnSubmit,
      });
    });

    it("creates generate variant action for user workflows", () => {
      const mockOnGenerate = vi.fn();
      const action = createGenerateVariantAction(mockOnGenerate);

      expect(action).toEqual({
        id: "generate-additional-variant",
        title: "Generate Additional Variant",
        icon: Icon.Stars,
        shortcut: { modifiers: ["cmd"], key: "g" },
        category: "enhancement",
        showWhen: "hasVariants",
        isLoading: false,
        onAction: mockOnGenerate,
      });
    });

    it("creates view prompt action for user workflows", () => {
      const mockComponent = <div>Mock Prompt</div>;
      const mockOnShowPrompt = vi.fn(() => mockComponent);

      const action = createViewPromptAction(mockOnShowPrompt);

      expect(action).toEqual({
        id: "view-prompt",
        title: "Show Full Prompt",
        icon: Icon.Document,
        shortcut: Keyboard.Shortcut.Common.ToggleQuickLook,
        category: "enhancement",
        showWhen: "hasFormValues",
        pushTarget: mockComponent,
      });
      expect(mockOnShowPrompt).toHaveBeenCalledOnce();
    });
  });

  describe("Copy Actions for User Results", () => {
    it("creates copy actions for user variants", () => {
      const variants = [
        { id: "v1", content: "Content 1" },
        { id: "v2", content: "Content 2" },
      ];
      const editableContents = { v1: "Edited 1" };

      const actions = createVariantCopyActions(variants, editableContents);

      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual({
        id: "copy-variant-v1",
        title: "Copy Answer 1",
        icon: Icon.Clipboard,
        shortcut: { modifiers: ["cmd"], key: "1" },
        category: "workflow",
        showWhen: "hasVariants",
        content: "Edited 1",
      });
      expect(actions[1]).toEqual({
        id: "copy-variant-v2",
        title: "Copy Answer 2",
        icon: Icon.Clipboard,
        shortcut: { modifiers: ["cmd"], key: "2" },
        category: "workflow",
        showWhen: "hasVariants",
        content: "Content 2",
      });
    });

    it("creates single copy action without number for single variant", () => {
      const variants = [{ id: "v1", content: "Content 1" }];
      const actions = createVariantCopyActions(variants, {});

      expect(actions[0].title).toBe("Copy Answer");
    });
  });

  describe("Action Groups for User Interface", () => {
    it("creates form action groups for user form interactions", () => {
      const mockOnSubmit = vi.fn();
      const groups = createFormActionGroups(mockOnSubmit);

      expect(groups.primary).toHaveLength(1);
      expect(groups.primary[0].id).toBe("ask-agent");
      expect(groups.copy).toHaveLength(0);
      expect(groups.generate).toHaveLength(0);
      expect(groups.secondary).toHaveLength(0);
    });
  });

  describe("User Action Execution", () => {
    it("executes actions properly for user workflows", () => {
      const mockCallback = vi.fn();
      const action = createAskAgentAction(mockCallback);

      // Simulate user action execution
      action.onAction?.();

      expect(mockCallback).toHaveBeenCalledOnce();
    });

    it("handles loading states during user actions", () => {
      const mockOnGenerate = vi.fn();
      const loadingAction = createGenerateVariantAction(mockOnGenerate, true);
      const normalAction = createGenerateVariantAction(mockOnGenerate, false);

      expect(loadingAction.isLoading).toBe(true);
      expect(normalAction.isLoading).toBe(false);
    });
  });
});
