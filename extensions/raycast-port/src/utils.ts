export const appendError = (result: { errors?: string[] }, functionName: string, error: unknown) => {
  if (!result.errors) result.errors = [];
  result.errors.push(`${functionName}: ${error instanceof Error ? error.message : error}`);
};
