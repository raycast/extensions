import { ActionPanel, Detail, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import markdownReference from "./reference";
import escape from "./markdown-escape";

interface ReferenceType {
  name: string;
  description: string;
  examples: Example[];
  additional_examples: AdditionalExample[];
}

interface Example {
  markdown: string;
  html: string;
}

interface AdditionalExample extends Example {
  name: string;
  description: string;
}

const MarkdownReference = () => {
  const [results, setResults] = useState<ReferenceType[]>(markdownReference);

  const { push } = useNavigation();

  const search = (query: string) => {
    if (query !== "") {
      const searchResults = markdownReference.filter((reference: ReferenceType) => {
        const refTitle = reference.name.toLowerCase();

        return refTitle.startsWith(query);
      });

      setResults(searchResults);
    } else {
      setResults(markdownReference);
    }
  };

  return (
    <List onSearchTextChange={(query: string) => search(query.toLowerCase())}>
      {results.length > 0 &&
        results.map((result, i) => (
          <List.Item
            key={i}
            title={result.name}
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  title="View"
                  onAction={() =>
                    push(
                      <Reference
                        name={result.name}
                        description={result.description}
                        examples={result.examples}
                        additional_examples={result.additional_examples}
                      />
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

const Reference = (reference: ReferenceType) => {
  const { pop } = useNavigation();

  let mdString = `
   # ${reference.name}
   ---
   ${reference.description}
   
   ## Examples
  `;

  reference.examples.map((example) => {
    mdString += `\n${escape(example.markdown)}\n`;
  });

  if (reference.additional_examples) {
    mdString += `# Additional Examples`;
    reference.additional_examples.map((additionalExample) => {
      mdString += `\n ## ${additionalExample.name}\n`;
      mdString += `${additionalExample.description}\n`;
      mdString += `\n${escape(additionalExample.markdown)}\n`;
    });
  }

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
