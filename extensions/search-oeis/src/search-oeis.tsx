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

  async function searchSequences(query: string) {
    if (query.length === 0) {
      setSequences([]);
      return;
    }

    try {
      const response = await fetch(`https://oeis.org/search?q=${encodeURIComponent(query)}&fmt=text`);
      const text = await response.text();

      // Process the text into blocks
      const blocks = text.split("\n\n").filter((block) => block.startsWith("%"));

      // Map blocks to sequences
      const formattedSequences = blocks.map((block) => {
        const lines = block.split("\n");
        const sequence: Partial<Sequence> = {
          number: "",
          name: "",
          description: "",
          formulas: [],
          comments: [],
        };

        lines.forEach((line) => {
          const dataType = line[1];
          const data = line.slice(10).trim();

          switch (dataType) {
            case "I":
              sequence.number = line.slice(3, 10).trim();
              break;
            case "N":
              sequence.name = data;
              break;
            case "S":
              sequence.description = data;
              break;
            case "C":
              sequence.comments?.push(data);
              break;
            case "F":
              sequence.formulas?.push({
                formula: data,
              });
              break;
          }
        });

        // Limit formulas to 5 and comments to 2 (for displaying brevity)
        return {
          ...sequence,
          formulas: (sequence.formulas || []).slice(0, 5),
          comments: (sequence.comments || []).slice(0, 2),
        } as Sequence;
      });

      setSequences(formattedSequences);
    } catch (error) {
      console.error("Error fetching sequences:", error);
    }
  }

  return (
    <List onSearchTextChange={searchSequences} throttle>
      {sequences.map((sequence) => (
        <SequenceListItem key={sequence.number} sequence={sequence} />
      ))}
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
