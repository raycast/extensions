import { List } from "@raycast/api";
import type { Snippet } from "../types";

const SnippetContent = ({ snippet, selectedFragment }: { snippet: Snippet; selectedFragment: number }) => {
  const getMarkdown = () => {
    const title = snippet.name;
    const language = snippet.content[selectedFragment].language;
    const text = snippet.content[selectedFragment].value;
    const folder = snippet.folder?.name ?? "Inbox";

    let code;
    if (language == "markdown") {
      code = text;
    } else {
      code = `~~~${language}
${text}
~~~
      `;
    }

    return `
## ${title} - ${folder} 

${code}
    `;
  };

  return <List.Item.Detail markdown={getMarkdown()} />;
};

export default SnippetContent;
