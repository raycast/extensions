import { MarkdownReformatter } from "./markdown-reformatter";
import { resolveTextInput } from "./resolve-text-input";

export function resolveMarkdownInput(argument?: string, clipboard?: string): string | null {
  const fromArgument = argument?.trim();
  const fromClipboard = clipboard?.trim();

  if (fromArgument && MarkdownReformatter.isLikelyMarkdown(fromArgument)) {
    return fromArgument;
  }

  if (fromClipboard && MarkdownReformatter.isLikelyMarkdown(fromClipboard)) {
    return fromClipboard;
  }

  return resolveTextInput(argument, clipboard);
}
