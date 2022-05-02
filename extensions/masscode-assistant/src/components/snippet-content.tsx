import { List } from "@raycast/api";
import type { Snippet } from "../types";

const SnippetContent = ({ snippet, selectedFragment }: { snippet: Snippet; selectedFragment: number }) => {
  const getMarkdown = () => {
    const title = snippet.name;
    const language = snippet.content[selectedFragment].language;
    const text = snippet.content[selectedFragment].value;

    if (language == "plain_text" || language == "markdown") {
      return `
# ${title}

${text}
      `;
    }

    return `
# ${title}

\`\`\`${language}
${text}
\`\`\`
    `;
  };

  return <List.Item.Detail markdown={getMarkdown()} />;
};

export default SnippetContent;
