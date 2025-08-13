import { Action, ActionPanel, Detail } from "@raycast/api";
import { CompanyData } from "../types";
import { buildMarkdown, markdownToHtml, markdownToPlainText } from "../lib/markdown-builder";
import { CompanyMetadata } from "./CompanyMetadata";

interface CompanyDetailsViewProps {
  data: CompanyData;
}

export function CompanyDetailsView({ data }: CompanyDetailsViewProps) {
  const markdown = buildMarkdown(data);

  return (
    <Detail
      markdown={markdown}
      metadata={<CompanyMetadata data={data} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={{
              html: markdownToHtml(markdown),
              text: markdownToPlainText(markdown),
            }}
          />
        </ActionPanel>
      }
    />
  );
}
