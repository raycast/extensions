import React, { useState, useEffect } from "react";
import { ActionPanel, Action, showToast, Toast, Icon, Detail } from "@raycast/api";
import { erpNextAPI } from "./api";
import { DocTypeItem, DocTypeMeta } from "./types";
import { organizeFieldsByMeta, getMetadataFields, formatValue } from "./utils/document-organizer";

interface DocumentDetailProps {
  doctype: string;
  name: string;
}

export function DocumentDetail({ doctype, name }: DocumentDetailProps) {
  const [document, setDocument] = useState<DocTypeItem | null>(null);
  const [meta, setMeta] = useState<DocTypeMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocumentAndMeta() {
      try {
        setLoading(true);

        // Fetch both document and its metadata in parallel
        const [doc, docMeta] = await Promise.all([
          erpNextAPI.getDocumentDetail(doctype, name),
          erpNextAPI.getDocTypeMeta(doctype),
        ]);
        setMeta(docMeta);
        setDocument(doc);
      } catch (error) {
        console.error("Error fetching document:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch document");
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load document",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDocumentAndMeta();
  }, [doctype, name]);

  // Loading state
  if (loading) {
    return <Detail isLoading={true} navigationTitle={`Loading ${name}...`} />;
  }

  // Error state
  if (error || !document) {
    return (
      <Detail
        markdown={`# Error Loading Document

**Error:** ${error || "Document not found"}

Please try again or check your connection to ERPNext.`}
        navigationTitle="Error"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open in Erpnext"
              icon={Icon.Globe}
              url={erpNextAPI.getDocumentURL(doctype, name)}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Use metadata to organize fields if available, fallback to simple organization
  let fieldGroups;
  let metadata;

  if (meta) {
    fieldGroups = organizeFieldsByMeta(document, meta);
    metadata = getMetadataFields(document, meta);
  } else {
    // Fallback to simple organization
    const importantFields = ["title", "subject", "status", "docstatus", "owner", "creation", "modified"];
    const standardFields = Object.keys(document).filter(
      (key) =>
        !importantFields.includes(key) &&
        !key.startsWith("_") &&
        document[key] !== null &&
        document[key] !== undefined &&
        document[key] !== "",
    );

    fieldGroups = [
      {
        title: "Details",
        fields: standardFields.map((field) => ({
          fieldname: field,
          label: field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          value: document[field],
        })),
      },
    ];

    metadata = importantFields
      .filter((field) => document[field] !== undefined && document[field] !== null && document[field] !== "")
      .reduce(
        (acc, field) => {
          const label = field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
          acc[label] = formatValue(document[field]);
          return acc;
        },
        {} as Record<string, string>,
      );
  }

  // Create main content markdown from organized field groups
  const markdown = `# ${document.name || name}

${fieldGroups
  .map((group) => {
    if (group.fields.length === 0) return "";

    const fieldsContent = group.fields.map((field) => `**${field.label}:** ${formatValue(field.value)}`).join("  \n");

    return `## ${group.title}\n${fieldsContent}\n`;
  })
  .join("\n")}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${doctype}: ${document.name || name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="DocType" text={doctype} />
          {Object.entries(metadata).map(([key, value]) => (
            <Detail.Metadata.Label key={key} title={key} text={value} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Erpnext"
            icon={Icon.Globe}
            url={erpNextAPI.getDocumentURL(doctype, document.name || name)}
          />
          <Action.OpenInBrowser
            title="Edit in Erpnext"
            icon={Icon.Pencil}
            url={erpNextAPI.getDocumentURL(doctype, document.name || name)}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard
            title="Copy Document Name"
            content={document.name || name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Doctype"
            content={doctype}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Document JSON"
            content={JSON.stringify(document, null, 2)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
