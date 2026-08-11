// turndown-plugin-gfm ships no type declarations and has no @types package.
// Only the `tables` plugin is used here; the module exports several others
// (strikethrough, taskListItems, gfm) with the same Plugin shape.
declare module "turndown-plugin-gfm" {
  import type { Plugin } from "turndown";
  export const tables: Plugin;
  export const strikethrough: Plugin;
  export const taskListItems: Plugin;
  export const gfm: Plugin;
}
