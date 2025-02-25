import { Form, ActionPanel, Action, Detail } from "@raycast/api";
import { useState } from "react";
import { diffWords } from "diff";

export default function TextDiff() {
  const [oldText, setOldText] = useState("");
  const [newText, setNewText] = useState("");

  const generateDiff = () => {
    const differences = diffWords(oldText, newText);
    const markdownDiff = differences
      .map((part) => {
        const value = part.value.replace(/\n/g, "\n\n");
        if (part.added) {
          return `**🟩 ${value}**`;
        } else if (part.removed) {
          return `~~🟥 ${value}~~`;
        }
        return value;
      })
      .join("");

    return `
  # Text Difference
  
  ## Original Text
  \`\`\`
  ${oldText}
  \`\`\`
  
  ## Modified Text
  \`\`\`
  ${newText}
  \`\`\`
  
  ## Diff Result
  ${markdownDiff}
  
  ### Legend
  - 🟥 ~~Removed text~~ = Deletions
  - 🟩 **Added text** = Additions
  - Unchanged text = Common text
  `;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Diff"
            target={<Detail markdown={generateDiff()} navigationTitle="Text Difference" />}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="old"
        title="Original Text"
        placeholder="Enter original text"
        value={oldText}
        onChange={setOldText}
      />
      <Form.TextArea
        id="new"
        title="Modified Text"
        placeholder="Enter modified text"
        value={newText}
        onChange={setNewText}
      />
    </Form>
  );
}
