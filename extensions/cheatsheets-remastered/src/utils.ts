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

/*
  Converts HTML elements to a more readable format for Raycast.

  Handles:
  * <details> and <summary> elements - converts to collapsible sections
  * <code> elements - preserves inline code formatting
  * Other HTML tags - strips tags but preserves content
*/
function formatHtmlElements(markdown: string): string {
  let result = markdown;

  // Handle <details> and <summary> elements
  result = result.replace(
    /<details>\s*<summary[^>]*>(.*?)<\/summary>\s*(.*?)<\/details>/gs,
    (match, summary, content) => {
      // Clean up the summary text (remove HTML tags, preserve formatting)
      const cleanSummary = summary
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/\*\*(.*?)\*\*/g, "**$1**") // Preserve bold
        .replace(/`(.*?)`/g, "`$1`") // Preserve inline code
        .trim();

      // Clean up the content (remove HTML tags, preserve formatting)
      const cleanContent = content
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/\*\*(.*?)\*\*/g, "**$1**") // Preserve bold
        .replace(/`(.*?)`/g, "`$1`") // Preserve inline code
        .trim();

      return `**${cleanSummary}**\n\n${cleanContent}`;
    },
  );

  // Handle standalone <code> elements
  result = result.replace(/<code[^>]*>(.*?)<\/code>/g, "`$1`");

  // Handle other HTML tags (strip them but preserve content)
  result = result.replace(/<[^>]*>/g, "");

  return result;
}

export { getSheets, stripFrontmatter, stripTemplateTags, formatTables, formatHtmlElements };
