export function formatMessage(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), value),
    template
  );
}

export function formatFileSystemError(template: string, path: string, error?: string): string {
  const replacements: Record<string, string> = { path };
  if (error) {
    replacements.error = error;
  }
  return formatMessage(template, replacements);
}

export function formatValidationError(template: string, values: Record<string, string | number>): string {
  const stringValues = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.toString()]));
  return formatMessage(template, stringValues);
}
