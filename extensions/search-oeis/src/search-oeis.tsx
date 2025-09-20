import { ActionPanel, Action, List, useNavigation, Detail } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

interface Formula {
  formula: string;
}

interface Sequence {
  number: string;
  name: string;
  description: string;
  formulas?: Formula[];
  comments?: string[];
}

export default function Command() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function searchSequences(query: string) {
    if (query.length === 0) {
      setSequences([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`https://oeis.org/search?q=${encodeURIComponent(query)}&fmt=text`);
      const text = await response.text();

      // Split the text into lines for line-by-line processing
      const lines = text.split("\n");

      const formattedSequences: Sequence[] = [];
      let sequence: Partial<Sequence> = {
        number: "",
        name: "",
        description: "",
        formulas: [],
        comments: [],
      };

      let formulaCount = 0;
      let commentCount = 0;

      for (const line of lines) {
        if (!line.startsWith("%")) {
          continue; // Skip lines that don't start with the relevant data identifier
        }

        const dataType = line[1];
        const data = line.slice(10).trim();

        switch (dataType) {
          case "I":
            if (sequence.number) {
              // Push the previous sequence before starting a new one
              formattedSequences.push({
                ...sequence,
                formulas: (sequence.formulas || []).slice(0, 5),
                comments: (sequence.comments || []).slice(0, 2),
              } as Sequence);
              sequence = { number: "", name: "", description: "", formulas: [], comments: [] };
              formulaCount = 0;
              commentCount = 0;
            }
            sequence.number = line.slice(3, 10).trim();
            break;
          case "N":
            sequence.name = data;
            break;
          case "S":
            sequence.description = data;
            break;
          case "C":
            if (commentCount < 2) {
              sequence.comments?.push(data);
              commentCount++;
            }
            break;
          case "F":
            if (formulaCount < 5) {
              sequence.formulas?.push({ formula: data });
              formulaCount++;
            }
            break;
        }

        // Stop parsing if we already have enough data for the current sequence
        if (sequence.number && sequence.name && sequence.description && formulaCount === 5 && commentCount === 2) {
          formattedSequences.push({
            ...sequence,
            formulas: (sequence.formulas || []).slice(0, 5),
            comments: (sequence.comments || []).slice(0, 2),
          } as Sequence);
          break;
        }
      }

      setSequences(formattedSequences);
    } catch (error) {
      console.error("Error fetching sequences:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      onSearchTextChange={searchSequences}
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Input a sequence or the sequence's name to start the search..."
    >
      {sequences.length === 0 ? (
        <List.EmptyView
          title="No Sequences Found"
          description="Try searching for something like 'Fibonacci' or input a sequence such as '3, 5, 17, 257, 65537, 4294967297, 18446744073709551617' with or without commas"
        />
      ) : (
        sequences.map((sequence) => <SequenceListItem key={sequence.number} sequence={sequence} />)
      )}
    </List>
  );
}

function SequenceListItem({ sequence }: { sequence: Sequence }) {
  const { push } = useNavigation();

  return (
    <List.Item
      title={sequence.name}
      subtitle={sequence.number}
      actions={
        <ActionPanel>
          <Action title="Show Details" onAction={() => push(<SequenceDetail sequence={sequence} />)} />
        </ActionPanel>
      }
    />
  );
}

function SequenceDetail({ sequence }: { sequence: Sequence }) {
  return (
    <Detail
      navigationTitle={sequence.name}
      markdown={`
### Sequence ${sequence.number} [More Information on OEIS](https://oeis.org/${sequence.number})

**Name:** ${sequence.name}

**Description:**
${sequence.description}

**Formulas:**
${
  sequence.formulas && sequence.formulas.length > 0
    ? sequence.formulas.map((f) => `- ${f.formula}`).join("\n")
    : "No formulas available"
}

**Comments:**
${sequence.comments && sequence.comments.length > 0 ? sequence.comments.join("\n") : "No comments available"}
      `}
    />
  );
}
