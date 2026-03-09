declare module "markdown-it-task-lists" {
  import type MarkdownIt from "markdown-it";

  type MarkdownItPlugin = (md: MarkdownIt, options?: { enabled?: boolean; label?: boolean; labelAfter?: boolean }) => void;

  const plugin: MarkdownItPlugin;

  export default plugin;
}
