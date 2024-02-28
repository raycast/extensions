import { List } from "@raycast/api";
import type { Snippet, SnippetContent } from "../types";

const SnippetContent = ({ snippet }: { snippet: Snippet }) => {
  const getMarkdown = () => {
    const title = snippet.content?.title ?? snippet.name ?? "";
    const description = snippet.content?.description ?? "";
    const content = snippet.content?.content ?? "";
    const folder = snippet.folder ?? "Inbox";
    const descriptionTxt = description
      .split("\n")
      .map((d) => `> ${d}`)
      .join("\n");

    return `### ${title} - ${folder}

${descriptionTxt}

${content}
    `;
  };

  return <List.Item.Detail markdown={getMarkdown()} />;
};

export default SnippetContent;
