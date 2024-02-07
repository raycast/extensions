import { Text } from "slate";
import { CustomNode } from "../types/announcements";

export function generateAnnouncementMarkdown(content: CustomNode[], excludeTitle = false) {
  // we run each node through the recursive serialize function
  const serialized = content.map((c) => serialize(c));
  if (excludeTitle) return serialized.slice(1).join("\n\n");
  else return serialized.join("\n\n");
}

function serialize(node: CustomNode): string {
  // text nodes are usually leaf nodes so we process them as text and return the transformed string w/ formatting elements
  if (Text.isText(node)) {
    let string = "";

    if ("bold" in node) string += `**`;
    if ("italic" in node) string += `_`;
    // if (node.underline) string += `<u>`;
    if ("strikethrough" in node) string += `~`;
    string += node.text;
    if ("strikethrough" in node) string += `~`;
    // if (node.underline) string += `</u>`;
    if ("italic" in node) string += `_`;
    if ("bold" in node) string += `**`;
    return string;
  }

  // since a node may have further nodes as children, we recursively call the serialize function on each child node
  const children = node.children.map((n) => serialize(n as CustomNode)).join("");

  // these are the nodes that require extra formatting based on Frill's custom Slate implementation
  switch (node.type) {
    case "announcement-title":
      return `# ${children}`;
    case "heading":
      return `${new Array(node.level).fill("#").join("")} ${children}`;
    case "idea":
      return `EMBEDDED IDEA: ${node.ideaIdx}`;
    case "image": {
      const align = node?.align || "center";
      return `<img src="${node.url}" alt="${node.alt}" align=${align} />`;
    }
    case "link":
      return `[${children}](${node.url})`;
    case "list-item":
      return `- ${children}\n`;
    case "code":
      return `\`${children}\``;
    case "code-block":
      return `\`\`\`
${children}
\`\`\``;
    default: {
      return children;
    }
  }
}
