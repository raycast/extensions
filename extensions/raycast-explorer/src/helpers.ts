export const CONTRIBUTE_URL = "https://github.com/raycast/extensions/edit/main/extensions/raycast-explorer";

export function wrapInCodeBlock(text: string, language = "sh") {
  const backticks = "```";
  return `${backticks}${language}\n${text}\n${backticks}`;
}
