/**
 * Checks the value can be a valid branch name
 * @param value The name of the branch
 * @returns An error message that should be appended to a string with the field name
 */
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
