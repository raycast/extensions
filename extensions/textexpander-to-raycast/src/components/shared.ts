export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if ("code" in error) {
      if (error.code === "EEXIST")
        return "A file or folder with this name already exists. Choose a different filename.";
      if (error.code === "EACCES" || error.code === "EPERM")
        return "Raycast cannot access this location. Choose a folder or file you can access.";
      if (error.code === "ENOENT") return "The file or folder no longer exists. Choose another location.";
    }
    return error.message;
  }
  return "An unexpected error occurred.";
}

export function textPreview(text: string): string {
  const longestRun = (text.match(/`+/g) ?? []).reduce((longest, run) => Math.max(longest, run.length), 2);
  const fence = "`".repeat(longestRun + 1);
  return `${fence}text\n${text}\n${fence}`;
}
