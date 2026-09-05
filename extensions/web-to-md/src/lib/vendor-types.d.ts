// turndown-plugin-gfm ships no type declarations, so we declare the module here.
// Keep this file free of top-level imports: a top-level import would turn it into
// a module, which downgrades the block below to a module *augmentation* — and an
// untyped package cannot be augmented (TS2665).
declare module "turndown-plugin-gfm" {
  import TurndownService from "turndown";

  export const gfm: TurndownService.Plugin;
  export const tables: TurndownService.Plugin;
  export const strikethrough: TurndownService.Plugin;
  export const taskListItems: TurndownService.Plugin;
}
