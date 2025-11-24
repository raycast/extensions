import { useState } from "react";
import { Form, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { encode } from "@toon-format/toon";

type OutputState = { type: "success"; toon: string } | { type: "error"; message: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export default function Command() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<OutputState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const json = JSON.parse(input);
      const toon = encode(json);
      setOutput({ type: "success", toon });
    } catch (error) {
      setOutput({ type: "error", message: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }

  if (output === null) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Convert to TOON" onSubmit={handleSubmit} isLoading={isLoading} />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Convert"
          text="Paste any JSON below. We'll format it into TOON so it's easier to drop into prompts."
        />
        <Form.TextArea
          id="json"
          title="Input JSON"
          placeholder='{"name":"Ada","skills":["math","logic"]}'
          value={input}
          onChange={setInput}
        />
      </Form>
    );
  }

  if (output.type === "error") {
    return (
      <Detail
        markdown={`### Could not convert
\n${output.message}`}
        actions={
          <ActionPanel>
            <Action title="Back" onAction={() => setOutput(null)} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={`### TOON preview

${output.toon.trim() ? `\`\`\`toon\n${output.toon}\n\`\`\`` : "(Empty output)"}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Result" content={output.toon} icon={Icon.Clipboard} />
            <Action title="Back" onAction={() => setOutput(null)} icon={Icon.ArrowLeft} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
