import { useState } from "react";
import { Action, ActionPanel, Detail, Form, useNavigation } from "@raycast/api";
import { marked } from "marked";

// Configure marked for secure rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

function MarkdownInput() {
  const [markdown, setMarkdown] = useState("");
  const { push } = useNavigation();

  const handleSubmit = () => {
    if (markdown.trim()) {
      push(<MarkdownPreview markdown={markdown} />);
    }
  };

  return (
    <Form
      navigationTitle="Markdown Editor"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Markdown" onSubmit={handleSubmit} />
          <Action title="Clear" shortcut={{ modifiers: ["cmd", "shift"], key: "k" }} onAction={() => setMarkdown("")} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="markdown"
        title="Markdown Content"
        info="Examples: # Heading 1, **Bold text**, *italic text*, - Bullet list, [Link](url), `inline code`"
        placeholder="Enter your Markdown content here..."
        value={markdown}
        onChange={setMarkdown}
        enableMarkdown={true}
        storeValue={false}
      />
    </Form>
  );
}

interface MarkdownPreviewProps {
  markdown: string;
}

function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const { pop } = useNavigation();

  // Convert markdown to HTML (marked returns string synchronously for most content)
  const htmlContent = marked(markdown) as string;

  return (
    <Detail
      navigationTitle="Markdown Preview"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Back to Editor" shortcut={{ modifiers: ["cmd"], key: "backspace" }} onAction={pop} />
          <Action.CopyToClipboard
            title="Copy Markdown"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy HTML"
            content={htmlContent}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Characters" text={markdown.length.toString()} />
          <Detail.Metadata.Label
            title="Words"
            text={markdown
              .split(/\s+/)
              .filter((word) => word.length > 0)
              .length.toString()}
          />
          <Detail.Metadata.Label title="Lines" text={markdown.split("\n").length.toString()} />
        </Detail.Metadata>
      }
    />
  );
}

export default function PreviewMarkdown() {
  return <MarkdownInput />;
}
