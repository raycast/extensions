import { Icon, Keyboard } from "@raycast/api";
import { JSX } from "react";

/**
 * Action hierarchy categories for organizing actions
 */
export type ActionCategory = "workflow" | "enhancement" | "management" | "destructive";

/**
 * Conditions that determine when actions should be shown
 */
export type ShowCondition =
  | "always" // Always visible
  | "hasVariants" // When variants exist
  | "hasFormValues" // When form has data
  | "hasCustomContent" // When custom tones/templates exist
  | "isProcessing" // During AI processing
  | "hasSelection" // When text is selected
  | "advanced"; // Only in advanced mode

/**
 * Base action interface extending common properties
 */
export interface BaseAction {
  id: string;
  title: string;
  icon?: Icon;
  shortcut?: Keyboard.Shortcut;
  category: ActionCategory;
  showWhen: ShowCondition;
}

/**
 * Primary actions - always visible and most important
 */
export interface PrimaryAction extends BaseAction {
  category: "workflow";
  showWhen: "always";
  onAction: () => void | Promise<void>;
}

/**
 * Secondary actions - contextual enhancements
 */
export interface SecondaryAction extends BaseAction {
  category: "enhancement";
  onAction?: () => void | Promise<void>;
  pushTarget?: JSX.Element;
}

/**
 * Management actions - administrative operations
 */
export interface ManagementAction extends BaseAction {
  category: "management";
  onAction: () => void | Promise<void>;
}

/**
 * Copy actions - clipboard operations
 */
export interface CopyAction extends BaseAction {
  category: "workflow";
  content: string;
  showToast?: boolean;
}

/**
 * Generate actions - content creation
 */
export interface GenerateAction extends BaseAction {
  category: "enhancement";
  onAction: () => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Destructive actions - dangerous operations
 */
export interface DestructiveAction extends BaseAction {
  category: "destructive";
  onAction: () => void | Promise<void>;
  confirmationTitle?: string;
  confirmationMessage?: string;
}

/**
 * Context information for determining action visibility and behavior
 *
 * This interface provides all the necessary context for the progressive disclosure
 * system to determine which actions should be visible in different states.
 */
export interface ActionContext {
  // Content state - what content is currently available
  /** Whether any formatting variants exist */
  hasVariants: boolean;
  /** Whether form has been filled with values */
  hasFormValues: boolean;
  /** Whether user has created custom tones/templates */
  hasCustomContent: boolean;
  /** Whether AI processing is currently in progress */
  isProcessing: boolean;
  /** Whether user has selected text in the interface */
  hasSelection: boolean;

  // User preferences - user-controlled settings
  /** Whether to show advanced/power-user actions */
  showAdvanced: boolean;

  // Content data - actual content for actions to operate on
  /** ID of currently selected variant */
  selectedVariant?: string;
  /** Combined text of all variants for bulk operations */
  allVariants?: string;
  /** Array of all available variants with their content */
  variants?: Array<{ id: string; content: string }>;

  // Navigation handlers - functions for cross-command navigation
  /** Function to open another command with optional initial state */
  openCommand?: (commandName: string, initialState?: unknown) => void;
  /** Function to trigger variant generation */
  onGenerateVariant?: () => void;
  /** Function to edit a specific variant */
  onEditVariant?: (variantId: string) => void;
}

/**
 * Grouped actions for rendering in sections
 */
export interface ActionGroups {
  primary: PrimaryAction[];
  copy: CopyAction[];
  generate: GenerateAction[];
  secondary: SecondaryAction[];
  management: ManagementAction[];
  destructive: DestructiveAction[];
}
