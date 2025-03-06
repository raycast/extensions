export function format(template: string, ...args: string[]): string {
  return template.replace(/{(\d+)}/g, (match, index) => args[index] ?? match);
}
