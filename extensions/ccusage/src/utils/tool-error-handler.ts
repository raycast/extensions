/**
 * Standardized error handling utility for ccusage tools
 * @param error - The error object to handle
 * @param context - Context description for the error
 * @throws Error with formatted message
 */
export const handleToolError = (error: unknown, context: string): never => {
  const message = error instanceof Error ? error.message : "Unknown error";
  throw new Error(`${context}: ${message}`);
};
