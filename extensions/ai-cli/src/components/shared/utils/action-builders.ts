import { Icon, Keyboard } from "@raycast/api";
import {
  ActionContext,
  ActionGroups,
  CopyAction,
  GenerateAction,
  PrimaryAction,
  SecondaryAction,
} from "@/types/actions";
import { messages } from "@/locale/en/messages";
import { JSX } from "react";

// Keyboard Shortcut Constants

export const SHORTCUTS = {
  VIEW_PROMPT: Keyboard.Shortcut.Common.ToggleQuickLook,
  GENERATE: { modifiers: ["cmd"], key: "g" } as Keyboard.Shortcut,
  REGENERATE: { modifiers: ["cmd"], key: "r" } as Keyboard.Shortcut,
  COPY_ALL: { modifiers: ["cmd", "shift"], key: "a" } as Keyboard.Shortcut,
  COPY_VARIANT: {
    1: { modifiers: ["cmd"], key: "1" } as Keyboard.Shortcut,
    2: { modifiers: ["cmd"], key: "2" } as Keyboard.Shortcut,
    3: { modifiers: ["cmd"], key: "3" } as Keyboard.Shortcut,
    4: { modifiers: ["cmd"], key: "4" } as Keyboard.Shortcut,
    5: { modifiers: ["cmd"], key: "5" } as Keyboard.Shortcut,
  },
  CANCEL: { modifiers: ["cmd", "shift"], key: "w" } as Keyboard.Shortcut,
  SUBMIT: { modifiers: ["cmd"], key: "enter" } as Keyboard.Shortcut,
  DELETE: { modifiers: ["cmd", "shift"], key: "backspace" } as Keyboard.Shortcut,
} as const;

// Action Helper Functions

/**
 * Creates a standard "view prompt" secondary action
 */
export function createViewPromptAction(onShowPrompt: () => JSX.Element): SecondaryAction {
  return {
    id: "view-prompt",
    title: messages.actions.showFullPrompt,
    icon: Icon.Document,
    shortcut: SHORTCUTS.VIEW_PROMPT,
    category: "enhancement",
    showWhen: "hasFormValues",
    pushTarget: onShowPrompt(),
  };
}

/**
 * Creates a standard "ask agent" primary action
 */
export function createAskAgentAction(onSubmit: () => void): PrimaryAction {
  return {
    id: "ask-agent",
    title: messages.actions.formatText,
    icon: Icon.Wand,
    category: "workflow",
    showWhen: "always",
    onAction: onSubmit,
  };
}

/**
 * Creates a standard "generate additional variant" action
 */
export function createGenerateVariantAction(onGenerate: () => void, isLoading = false): GenerateAction {
  return {
    id: "generate-additional-variant",
    title: messages.actions.generateAdditionalVariant,
    icon: Icon.Stars,
    shortcut: SHORTCUTS.GENERATE,
    category: "enhancement",
    showWhen: "hasVariants",
    isLoading,
    onAction: onGenerate,
  };
}

export function createVariantCopyActions(
  variants: Array<{ id: string; content: string }>,
  editableContents: Record<string, string>
): CopyAction[] {
  return variants.map((variant, index) => {
    const variantNumber = index + 1;
    const shouldHaveShortcut = index < 5; // Only first 5 variants get shortcuts

    return {
      id: `copy-variant-${variant.id}`,
      title: variants.length > 1 ? `${messages.actions.copyAnswer} ${variantNumber}` : messages.actions.copyAnswer,
      icon: Icon.Clipboard,
      category: "workflow",
      showWhen: "hasVariants",
      content: editableContents[variant.id] || variant.content,
      ...(shouldHaveShortcut && {
        shortcut: SHORTCUTS.COPY_VARIANT[variantNumber as keyof typeof SHORTCUTS.COPY_VARIANT],
      }),
    };
  });
}

/**
 * Creates a base action context with common defaults
 */
export function createBaseActionContext(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    hasVariants: false,
    hasFormValues: false,
    hasCustomContent: false,
    isProcessing: false,
    hasSelection: false,
    showAdvanced: false,
    ...overrides,
  };
}

// Action Group Builders

/**
 * Creates complete action groups for the TemplateForm component
 */
export function createFormActionGroups(
  onSubmit: () => void,
  onShowPrompt?: () => JSX.Element,
  canShowPrompt = false
): ActionGroups {
  const primary = [createAskAgentAction(onSubmit)];
  const secondary = canShowPrompt && onShowPrompt ? [createViewPromptAction(onShowPrompt)] : [];

  return {
    primary,
    copy: [],
    generate: [],
    secondary,
    management: [],
    destructive: [],
  };
}

/**
 * Creates action context for the TemplateForm component
 */
export function createFormActionContext(
  hasFormValues: boolean,
  isProcessing = false,
  showAdvanced = false
): ActionContext {
  return createBaseActionContext({
    hasFormValues,
    isProcessing,
    showAdvanced,
  });
}
