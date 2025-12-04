export function codeBlock(str: string): string {
  return `\`\`\`\n\n${str}\n\`\`\``;
}

export function inlineCode(str: string): string {
  return `\`${str}\``;
}

export function bold(str: string): string {
  return `**${str}**`;
}

export function italic(str: string): string {
  return `*${str}*`;
}

export function quoteBlock(str: string): string {
  return `> ${str}`;
}
