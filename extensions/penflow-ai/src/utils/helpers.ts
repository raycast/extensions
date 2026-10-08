import { showToast, Toast } from "@raycast/api";

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function handleError(error: unknown, context?: string) {
  console.error(context ? `Error in ${context}:` : "Error:", error);
  showToast({
    style: Toast.Style.Failure,
    title: context ? `${context} Failed` : "Error",
    message: error instanceof Error ? error.message : "An unexpected error occurred",
  });
}

export function isValidInput(input: string): boolean {
  return input.trim().length >= 2;
}
