// Helper function to split text into words from various formats
export function splitIntoWords(text: string): string[] {
  // Handle camelCase, PascalCase, snake_case, kebab-case, and spaces
  return (
    text
      // Insert space before uppercase letters that follow lowercase letters (camelCase/PascalCase)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Replace underscores and hyphens with spaces
      .replace(/[_-]/g, " ")
      // Split by spaces and filter out empty strings
      .split(/\s+/)
      .filter((word) => word.length > 0)
  );
}
