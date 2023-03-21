export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function codeBlock(content: string): string {
  return "```\n" + content + "\n```";
}
