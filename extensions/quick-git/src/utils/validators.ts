export function validateBranchName(value?: string): string | undefined {
  const newValue = value?.trim();
  if (!newValue) {
    return `is required`;
  } else if (/[~^:?*[\\\s]/g.test(newValue)) {
    return `contains invalid characters. Avoid using ~, ^, :, ?, *, [, \\, or any whitespace characters`;
  } else if (newValue.startsWith("-")) {
    return `cannot start with '-'`;
  }

  return undefined;
}
