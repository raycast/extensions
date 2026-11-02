import type { TextFileInput } from "./models";

export function starterFiles({
  title,
  html,
  css,
  js,
}: {
  title: string;
  html: string;
  css: string;
  js: string;
}): TextFileInput[] {
  const escapedTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const files: TextFileInput[] = [];
  if (css.trim()) files.push({ path: "/style.css", content: css });
  if (js.trim()) files.push({ path: "/script.js", content: js });
  files.unshift({
    path: "/index.html",
    content: [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escapedTitle}</title>`,
      ...(css.trim() ? ['<link rel="stylesheet" href="/style.css">'] : []),
      "</head>",
      "<body>",
      html,
      ...(js.trim() ? ['<script type="module" src="/script.js"></script>'] : []),
      "</body>",
      "</html>",
    ].join("\n"),
  });
  return files;
}
