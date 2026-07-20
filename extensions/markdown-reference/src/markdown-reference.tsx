import { ActionPanel, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import markdownReference from "./markdownReference";
import Reference, { ReferenceType } from "./Reference";

const MarkdownReference = () => {
  const [results, setResults] = useState<ReferenceType[]>(markdownReference);

  const { push } = useNavigation();

  const search = (query: string) => {
    if (query !== "") {
      const searchResults = markdownReference.filter((reference: ReferenceType) => {
        const refTitle = reference.name.toLowerCase().split(" ");
        return refTitle[0].startsWith(query) || (refTitle.length > 1 && refTitle[1].startsWith(query));
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
                      />,
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

export default MarkdownReference;
