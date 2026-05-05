import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CompanyData } from "../types";
import { buildMarkdownAsync, markdownToHtml, markdownToPlainText } from "../lib/markdown-builder";
import { CompanyMetadata } from "./CompanyMetadata";

interface CompanyDetailsViewProps {
  data: CompanyData;
}

export function CompanyDetailsView({ data }: CompanyDetailsViewProps) {
  const { data: markdown, isLoading } = usePromise(
    async (companyData: CompanyData) => await buildMarkdownAsync(companyData),
    [data],
  );

  const displayMarkdown = markdown || "Loading company information...";

  return (
    <Detail
      markdown={displayMarkdown}
      isLoading={isLoading}
      metadata={<CompanyMetadata data={data} />}
      actions={
        markdown ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={{
                html: markdownToHtml(markdown),
                text: markdownToPlainText(markdown),
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
