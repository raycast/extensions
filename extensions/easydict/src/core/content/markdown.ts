/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Parentheses stay unescaped: Raycast reads `\(` … `\)` as inline math, and escaping `[` `]` already prevents links.
 */
export function plainText(text: string): string {
  return escapeHtml(text).replace(/([\\`*_{}[\]#+.!|>~-])/g, "\\$1");
}
