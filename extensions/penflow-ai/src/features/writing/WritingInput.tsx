import { Detail, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

interface WritingInputProps {
  onInputChange: (text: string) => void;
  onSubmit: (text: string) => void;
}

export function WritingInput({ onInputChange, onSubmit }: WritingInputProps) {
  const [text, setText] = useState("");

  const handleTextChange = (newText: string) => {
    setText(newText);
    onInputChange(newText);
  };

  return (
    <Detail
      markdown={text}
      actions={
        <ActionPanel>
          <Action title="Submit" onAction={() => onSubmit(text)} />
          <Action title="Clear" onAction={() => handleTextChange("")} />
        </ActionPanel>
      }
    />
  );
}
