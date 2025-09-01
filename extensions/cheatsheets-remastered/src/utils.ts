import { File } from "./service";

function getFileName(path: string): string {
  const tokens = path.split(".");
  return tokens[0];
}

function getFileExtension(path: string): string {
  const tokens = path.split(".");
  return tokens[1];
}

function getSheets(files: File[]): string[] {
  return files
    .filter((file) => {
      const isDir = file.type === "tree";
      const isMarkdown = getFileExtension(file.path) === "md";
      const adminFiles = ["CONTRIBUTING", "README", "index", "index@2016"];
      const isAdminFile = adminFiles.includes(getFileName(file.path));
      return !isDir && isMarkdown && !isAdminFile;
    })
    .map((file) => getFileName(file.path));
}

function stripFrontmatter(markdown: string): string {
  const frontmatterStart = markdown.indexOf("---");
  const frontmatterEnd = markdown.indexOf("---", frontmatterStart + 1);
  return markdown.substring(frontmatterEnd + 3);
}

/*
  Removes Jekyll templating tags

  Tag examples:
  * {: .-one-column}
  * {: .-two-column}
  * {: .-three-column}
  * {: .-intro}
  * {: .-prime}
  * {: .-setup}

  * {: data-line="1"}
  * {: data-line="2"}
  * {: data-line="3, 8, 16, 21, 28, 34, 39"}

  * {%raw%}
  * {%endraw%}
*/
function stripTemplateTags(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => {
      const isTag = (line[0] === "{" && line[1] === ":") || (line[1] === "%" && line[line.length - 1] === "}");
      return !isTag;
    })
    .join("\n");
}

/*
  Tables in Markdown are not yet supported by Raycast.

  Wraps table content into code tags (```) to render them verbatim.
*/
function formatTables(markdown: string): string {
  const lines = markdown.split("\n");
  return lines
    .map((line, index) => {
      const prevLine = index > 0 ? lines[index - 1] : "";
      const nextLine = index < lines.length - 1 ? lines[index + 1] : "";
      const isPrevLineEmpty = prevLine.trim().length === 0;
      const isNextLineEmpty = nextLine.trim().length === 0;
      const isLineTable = line[0] === "|" && line[line.length - 1] === "|";
      if (isLineTable && isPrevLineEmpty && isNextLineEmpty) {
        return `\`\`\`\n${line}\n\`\`\``;
      }
      if (isLineTable && isPrevLineEmpty) {
        return `\`\`\`\n${line}`;
      }
      if (isLineTable && isNextLineEmpty) {
        return `${line}\n\`\`\``;
      }
      return line;
    })
    .join("\n");
}

export { getSheets, stripFrontmatter, stripTemplateTags, formatTables };
