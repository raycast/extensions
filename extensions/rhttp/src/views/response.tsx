import { Action, ActionPanel, Color, Detail, Icon, Keyboard, open, showToast } from "@raycast/api";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { useState } from "react";
import { MAX_BODY_LENGTH, METHODS } from "~/constants";

import { addHistoryEntry } from "~/store/history";
import { NewRequest, ResponseData } from "~/types";

import { JSONExplorer } from "./json-explorer";
import os from "os";
import { OpenInEditorAction } from "~/components/actions";

export interface ResponseViewProps {
  requestSnapshot: NewRequest;
  sourceRequestId?: string;
  response: ResponseData;
}

export function ResponseView({ requestSnapshot, sourceRequestId, response }: ResponseViewProps) {
  const [showHeaders, setShowHeaders] = useState(false);

  function getStatusColor(status: number) {
    if (status >= 500) return Color.Red;
    if (status >= 400) return Color.Red;
    if (status >= 300) return Color.Orange;
    if (status >= 200) return Color.Green;
    return Color.PrimaryText;
  }

  function getMethodColor() {
    return METHODS[response.requestMethod]?.color ?? Color.PrimaryText;
  }

  // Create the metadata component once, as it's used in both views.
  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Link title="URL" text={response.requestUrl} target={response.requestUrl} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Method">
        <Detail.Metadata.TagList.Item text={response.requestMethod} color={getMethodColor()} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={`${response.status}`} color={getStatusColor(response.status)} />
        <Detail.Metadata.TagList.Item text={response.statusText} color={getStatusColor(response.status)} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      {Object.entries(response.headers).map(([key, value]) => (
        <Detail.Metadata.Label key={key} title={key} text={value.toString()} />
      ))}
    </Detail.Metadata>
  );

  // Detect content type
  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  const responseType = contentType.includes("text/html")
    ? "html"
    : contentType.includes("text/csv") || contentType.includes("application/csv")
      ? "csv"
      : "json";

  // Get body as string
  const bodyString = typeof response.body === "string" ? response.body : JSON.stringify(response.body, null, 2);

  // Prepare markdown based on type and toggle
  const getMarkdown = () => {
    if (showHeaders) {
      return `## Response Headers\n\`\`\`json\n${JSON.stringify(response.headers, null, 2)}\n\`\`\``;
    }

    const isBodyLarge = bodyString.length > MAX_BODY_LENGTH;
    const bodyPreview = isBodyLarge ? bodyString.slice(0, MAX_BODY_LENGTH) + "\n\n... (Body truncated)" : bodyString;

    switch (responseType) {
      case "html":
        return `## HTML Preview\n\`\`\`html\n${bodyPreview}\n\`\`\``;
      case "csv":
        return `## CSV Data\n\`\`\`\n${bodyPreview}\n\`\`\``;
      case "json":
      default:
        return `## JSON Body\n\`\`\`json\n${bodyPreview}\n\`\`\``;
    }
  };

  // Type-specific actions
  const getTypeSpecificActions = () => {
    const isBodyTooLarge = bodyString.length > 1000 * 1024;
    switch (responseType) {
      case "html":
        return (
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            onAction={async () => {
              const filePath = path.join(os.tmpdir(), `raycast-response-${randomUUID()}.html`);
              await fs.writeFile(filePath, bodyString);
              await open(filePath);
            }}
          />
        );
      case "json":
        return !isBodyTooLarge && !showHeaders ? (
          <Action.Push
            title="Explore Full Body"
            icon={Icon.CodeBlock}
            target={<JSONExplorer data={response.body} title="Response Body" />}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Detail
      markdown={getMarkdown()}
      navigationTitle="Response"
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action
            title={showHeaders ? "Show Body" : "Show Headers"}
            icon={showHeaders ? Icon.Code : Icon.List}
            onAction={() => setShowHeaders(!showHeaders)}
          />
          {getTypeSpecificActions()}
          <OpenInEditorAction responseBody={bodyString} fileType={responseType} />
          <Action.CopyToClipboard
            title="Copy Full Body"
            content={bodyString}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Headers"
            content={JSON.stringify(response.headers, null, 2)}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
          <Action
            title="Save to History"
            icon={Icon.Clock}
            onAction={async () => {
              await addHistoryEntry(requestSnapshot, response, sourceRequestId);
              void showToast({ title: "Saved to History" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
