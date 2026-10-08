import { Action, ActionPanel, Form, useNavigation, Detail } from "@raycast/api";
import { useState } from "react";
import firecrawl from "./firecrawl";

interface FormValues {
  url: string;
  showFullText: boolean;
  maxUrls: string;
}

const MAX_PREVIEW_LENGTH = 1500;

function truncateText(text: string, maxLength: number = MAX_PREVIEW_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\n\n... (content truncated for preview, use copy button for full content)";
}

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const maxUrls = Math.min(parseInt(values.maxUrls) || 10, 100);
      const result = await firecrawl.v1.generateLLMsText(values.url, {
        showFullText: values.showFullText,
        maxUrls,
      });

      if (!result.success) {
        throw new Error(`Failed to generate LLMs.txt ${result.error}`);
      }

      const llmsTxtContent = result.data.llmstxt.trim();
      const fullTextContent = result.data.llmsfulltxt?.trim() || "";

      const displayLlmsTxt = truncateText(llmsTxtContent);
      const displayFullText = fullTextContent ? truncateText(fullTextContent) : "";

      const markdown = values.showFullText
        ? `
\`\`\`markdown
${displayFullText}
\`\`\`
`
        : `
\`\`\`markdown
${displayLlmsTxt}
\`\`\`
`;

      push(
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                content={values.showFullText ? fullTextContent : llmsTxtContent}
                title="Copy Llms.txt"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      console.log(error);
      push(<Detail markdown="# Error\nFailed to generate LLMs.txt. Please try again." />);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Enter webpage URL" autoFocus />

      <Form.Checkbox id="showFullText" label="Get llms-full.txt" title="Options" defaultValue={false} />
      <Form.TextField id="maxUrls" title="Max URLs" placeholder="Maximum number of URLs to process" defaultValue="10" />
    </Form>
  );
}
