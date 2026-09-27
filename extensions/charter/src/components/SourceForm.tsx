import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { detectSource } from "../lib/render/source";
import RenderView from "./RenderView";

interface SourceFormProps {
  initial?: string;
}

const PLACEHOLDER = `flowchart LR
  A[Paste] --> B{Detected?}
  B -->|Yes| C[Draw]`;

/** Where the command lands when neither the selection nor the clipboard holds a chart. */
export default function SourceForm({ initial = "" }: SourceFormProps) {
  const { push } = useNavigation();
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | undefined>();

  function submit() {
    const source = detectSource(text);
    if (!source) {
      setError(
        text.trim()
          ? "Not recognized. Start with a Mermaid keyword such as flowchart, or paste an ECharts option as JSON with a series key."
          : "Paste a Mermaid diagram or an ECharts option.",
      );
      return;
    }
    setError(undefined);
    push(<RenderView source={source} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Render" icon={Icon.Image} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste a Mermaid diagram or an Apache ECharts option. A ```mermaid fence around it is fine." />
      <Form.TextArea
        id="source"
        title="Source"
        placeholder={PLACEHOLDER}
        value={text}
        error={error}
        onChange={(next) => {
          setText(next);
          if (error) setError(undefined);
        }}
      />
    </Form>
  );
}
