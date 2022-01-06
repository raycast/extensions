import { ActionPanel, Detail, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import markdownReference from "./reference";

interface Reference {
  name: string;
  description: string;
  examples: Example[];
}

interface Example {
  markdown: string;
  html: string;
  additional_examples?: AdditionalExample[];
}

interface AdditionalExample {
  name: string;
  description: string;
  markdown: string;
  html: string;
}

const MarkdownReference = () => {
  const [results, setResults] = useState<Reference[] | []>([]);

  const { push } = useNavigation();

  const search = (query: string) => {
    if (query !== "") {
      const searchResults = markdownReference.filter((reference: Reference) => {
        const refTitle = reference.name.toLowerCase();

        return refTitle.startsWith(query);
      });

      setResults(searchResults);
    } else {
      setResults([]);
    }
  };

  return (
    <List onSearchTextChange={(query: string) => search(query.toLowerCase())}>
      {results.length > 0 &&
        results.map((result) => (
          <List.Item
            title={result.name}
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  title="View"
                  onAction={() =>
                    push(<Reference name={result.name} description={result.description} examples={result.examples} />)
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

const Reference = (reference: Reference) => {
  const { pop } = useNavigation();

  const mdString = `# ${reference.name}\n${reference.description}\n\n\`${reference.examples[0].markdown}\``;
  return (
    <Detail
      markdown={mdString}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
};

export default MarkdownReference;
