import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { loadSnippets } from "./utils/loadSnippets";
import { Snippet, snippetTypesMap } from "./utils/types";

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const init = async () => {
    setLoading(true);
    const snippets = await loadSnippets();
    setSnippets(snippets);
    setLoading(false);
  };

  useEffect(() => {
    init();
  }, []);
  return (
    <List isLoading={loading}>
      {snippets.map((snippet) => (
        <List.Item title={snippet.name} key={snippet.id} id={snippet.id} subtitle={snippetTypesMap[snippet.type]} />
      ))}
    </List>
  );
}
