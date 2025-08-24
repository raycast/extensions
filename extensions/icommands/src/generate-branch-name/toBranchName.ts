// Converts a string to a git branch name (kebab-case, no special chars)
export function toBranchName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "-") // remove special chars
    .replace(/[_\s]+/g, "-") // spaces/underscores to dash
    .replace(/-+/g, "-") // collapse multiple dashes
    .replace(/^-+|-+$/g, ""); // trim dashes
}
