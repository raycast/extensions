import { useEffect, useState } from "react";
import { Detail, ActionPanel, Action } from "@raycast/api";
import useExtraction from "./hooks/useExtraction";

// Used for development
export const ENV = "app";

export default function ExtractionDetail(props: Readonly<{ documentType: string; filePath: string }>) {
  const { data: extraction, isLoading } = useExtraction(props.documentType, props.filePath);
  const [title, setTitle] = useState<string>("Extracting...");

  // Checks for single extraction response
  const singleExtractionResponse = extraction && "parsed_document" in extraction ? extraction : undefined;

  useEffect(() => {
    if (singleExtractionResponse) {
      const numberOfFields = singleExtractionResponse.validation_summary?.fields_present;
      if (numberOfFields) {
        setTitle(`Extracted ${numberOfFields} ${numberOfFields === 1 ? "Field" : "Fields"}`);
      }
    }
  }, [extraction]);

  const formatJson = (json: unknown) => JSON.stringify(json, null, 2);
  const markdown =
    extraction && "parsed_document" in extraction
      ? `### Fields Extracted: ${extraction.validation_summary?.fields_present} of ${
          extraction.validation_summary?.fields
        }\n
      \n~~~\n${formatJson(extraction.parsed_document)}
    `
      : `### Extracting...\n
View all your extractions at https://${ENV}.sensible.so/extractions/
    `;

  const viewLink = `https://${ENV}.sensible.so/extraction/?e=${singleExtractionResponse?.id}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={title}
      metadata={
        singleExtractionResponse && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Document Type" text={singleExtractionResponse.type} />
            <Detail.Metadata.Label title="Configuration Used" text={singleExtractionResponse.configuration} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Extraction" target={viewLink} text="View on Sensible.so" />
            <Detail.Metadata.Label title="Errors" text={singleExtractionResponse.errors.length.toString()} />
            <Detail.Metadata.Label title="Validations" text={singleExtractionResponse.validations?.length.toString()} />
          </Detail.Metadata>
        )
      }
      actions={
        singleExtractionResponse && (
          <ActionPanel>
            <Action.CopyToClipboard
              content={formatJson(singleExtractionResponse.parsed_document)}
              title="Copy Extracted Data"
            />
            <Action.OpenInBrowser url={viewLink} title="Open in Sensible" />
          </ActionPanel>
        )
      }
    />
  );
}
