/**
 * Type declarations for turndown-plugin-gfm
 * This plugin provides GitHub Flavored Markdown extensions for Turndown
 */
declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";

  /** Applies all GFM plugins (tables, strikethrough, taskListItems, highlightedCodeBlock) */
  export function gfm(turndownService: TurndownService): void;

  /** Converts HTML tables to GFM pipe tables when they have valid header rows */
  export function tables(turndownService: TurndownService): void;

  /** Converts del/s/strike elements to ~strikethrough~ syntax */
  export function strikethrough(turndownService: TurndownService): void;

  /** Converts checkbox inputs in list items to [x] or [ ] syntax */
  export function taskListItems(turndownService: TurndownService): void;

  /** Converts highlighted code blocks with language hints */
  export function highlightedCodeBlock(turndownService: TurndownService): void;
}
