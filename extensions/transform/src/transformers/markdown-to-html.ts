import md from "markdown-it";

export const TransformMarkdownToHTML = {
  from: "Markdown",
  to: "HTML",
  transform: (value: string) => md().render(value),
};
