/**
 * Main type exports for the Raycast Daytona extension
 * Centralized type definitions for improved maintainability and consistency
 */

// Re-export all domain types
export * from "./sandbox";
export * from "./git";
export * from "./api";
export * from "./ui";
export * from "./execution";
export * from "./cache";
export * from "./preferences";

// Common utility types
export type Status = "pending" | "loading" | "success" | "error" | "idle";

export type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Nullable<T> = T | null;

export type EmptyState = {
  title: string;
  description?: string;
  icon: string;
  actions?: Array<{
    title: string;
    action: () => void;
    icon?: string;
  }>;
};
