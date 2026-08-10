import type { Application } from "@raycast/api";
import { parseShellWords, shellQuote } from "./parsers";

export type TerminalKind = "terminal" | "iterm" | "ghostty" | "wezterm" | "kitty" | "alacritty" | "warp" | "generic";

export function detectTerminalKind(application?: Pick<Application, "bundleId" | "name" | "path">): TerminalKind {
  const identity = `${application?.bundleId || ""} ${application?.name || ""} ${application?.path || ""}`.toLowerCase();
  if (identity.includes("com.apple.terminal") || /(?:^|\s|\/)terminal(?:\.app)?(?:\s|$)/.test(identity))
    return "terminal";
  if (identity.includes("iterm") || identity.includes("com.googlecode.iterm2")) return "iterm";
  if (identity.includes("ghostty")) return "ghostty";
  if (identity.includes("wezterm")) return "wezterm";
  if (identity.includes("kitty")) return "kitty";
  if (identity.includes("alacritty")) return "alacritty";
  if (identity.includes("warp")) return "warp";
  return "generic";
}

export function expandCustomLauncher(template: string, binary: string, args: string[]): [string, string[]] {
  const words = parseShellWords(template);
  if (words.length === 0) throw new Error("The Custom Terminal Launcher preference is empty.");
  const expanded: string[] = [];
  for (const word of words) {
    if (word === "{herdr}") expanded.push(binary);
    else if (word === "{args}") expanded.push(...args);
    else if (word === "{command}") expanded.push([binary, ...args].map(shellQuote).join(" "));
    else expanded.push(word.replaceAll("{herdr}", binary));
  }
  if (!template.includes("{herdr}") && !template.includes("{command}")) {
    throw new Error("Custom Terminal Launcher must contain {herdr} or {command}.");
  }
  return [expanded[0], expanded.slice(1)];
}
