/**
 * UI component types
 * Centralized definitions for component props and UI-related interfaces
 */

import React from "react";
import { Sandbox, SandboxActionType } from "./sandbox";
import { GitOperation } from "./git";

// Common UI component props
export interface BaseComponentProps {
  className?: string;
  testId?: string;
  children?: React.ReactNode;
}

export interface LoadingViewProps extends BaseComponentProps {
  message?: string;
  showSpinner?: boolean;
  size?: "small" | "medium" | "large";
}

export interface EmptyStateProps extends BaseComponentProps {
  type: "sandbox" | "snapshot" | "file" | "git" | "search" | "execution" | "generic";
  title?: string;
  description?: string;
  icon?: string;
  actions?: EmptyStateAction[];
}

export interface EmptyStateAction {
  id: string;
  title: string;
  icon?: string;
  action: () => void;
  variant?: "primary" | "secondary";
}

export interface ErrorViewProps extends BaseComponentProps {
  error: Error | string;
  onRetry?: () => void;
  showDetails?: boolean;
  showRetryButton?: boolean;
  retryButtonText?: string;
}

// Sandbox-related UI types
export interface SandboxItemProps extends BaseComponentProps {
  sandbox: Sandbox;
  onAction?: (action: SandboxActionType, sandbox: Sandbox) => void;
  showRepository?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
  variant?: "list" | "card" | "minimal";
  customActions?: ActionPanelItem[];
}

export interface SandboxActionPanelProps {
  sandbox: Sandbox;
  onAction: (action: SandboxActionType) => void;
  customActions?: ActionPanelItem[];
  showAllActions?: boolean;
}

export interface SandboxStatusBadgeProps {
  status: Sandbox["status"];
  showText?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "default" | "minimal" | "detailed";
}

// Form component types
export interface FormFieldProps<T> {
  name: keyof T;
  label: string;
  type: "text" | "password" | "email" | "url" | "textarea" | "number";
  value: T[keyof T];
  onChange: (value: T[keyof T]) => void;
  validation?: ValidationRule[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
}

export interface FormSelectProps<T> {
  name: keyof T;
  label: string;
  options: SelectOption[];
  value: T[keyof T];
  onChange: (value: T[keyof T]) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: string;
}

export interface ValidationRule {
  type: "required" | "minLength" | "maxLength" | "pattern" | "custom";
  value?: string | number | RegExp;
  message: string;
  validator?: (value: unknown) => boolean;
}

// List component types
export interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterFunction?: (item: T, query: string) => boolean;
  emptyState?: EmptyStateProps;
  loading?: boolean;
  error?: Error | string;
  onRetry?: () => void;
}

export interface ListItemProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  accessories?: Accessory[];
  actions?: ActionPanelItem[];
  detail?: React.ReactNode;
}

export interface Accessory {
  text?: string;
  icon?: string;
  tooltip?: string;
  date?: Date;
  tag?: {
    value: string;
    color?: string;
  };
}

export interface ActionPanelItem {
  id: string;
  title: string;
  icon?: string;
  shortcut?: { modifiers: string[]; key: string };
  onAction: () => void;
  style?: "regular" | "destructive";
}

// Navigation and layout types
export interface NavigationItem {
  id: string;
  title: string;
  icon?: string;
  component: React.ComponentType;
  badge?: string | number;
}

export interface BreadcrumbItem {
  title: string;
  path?: string;
  onClick?: () => void;
}

// Search and filtering types
export interface SearchOptions {
  placeholder?: string;
  onSearchTextChange?: (text: string) => void;
  throttle?: number;
  debounce?: number;
}

export interface FilterOption {
  key: string;
  label: string;
  value: string | boolean | number;
  count?: number;
}

export interface SortOption {
  key: string;
  label: string;
  direction: "asc" | "desc";
}

// Git-related UI types
export interface GitOperationButtonProps {
  operation: GitOperation;
  icon?: string;
  title?: string;
  onExecute: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface GitStatusItemProps {
  file: {
    path: string;
    status: string;
    staged: boolean;
  };
  onToggleStage?: (path: string) => void;
  onViewDiff?: (path: string) => void;
}

// Toast and notification types
export interface ToastOptions {
  style?: "success" | "failure";
  title: string;
  message?: string;
  primaryAction?: {
    title: string;
    onAction: () => void;
    shortcut?: { modifiers: string[]; key: string };
  };
  secondaryAction?: {
    title: string;
    onAction: () => void;
    shortcut?: { modifiers: string[]; key: string };
  };
}
