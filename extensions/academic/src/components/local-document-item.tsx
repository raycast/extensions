import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  applyVerifiedRename,
  findRelatedDocuments,
  undoDocumentRename,
} from "../local-library/indexer";
import type { LocalDocument } from "../local-library/types";
import { queueLocalDocumentsForReprocessing } from "../local-library/storage";

export function LocalDocumentItem({
  document,
  reload,
}: {
  document: LocalDocument;
  reload: () => void;
}) {
  const { push } = useNavigation();
  const proposed =
    document.suggestedFilename &&
    document.suggestedFilename !== document.filename
      ? document.suggestedFilename
      : undefined;
  return (
    <List.Item
      id={`local:${document.id}`}
      title={document.work?.title ?? document.filename}
      subtitle={
        document.work?.authors.join(", ") ||
        `${document.stage}${document.error ? ` · ${document.error}` : ""}`
      }
      icon={document.validation?.safe ? Icon.CheckCircle : Icon.Document}
      accessories={[
        {
          tag:
            document.analysis?.engine ??
            (document.evidence ? "experimental off" : "pending"),
        },
        { text: `${Math.round(document.size / 1024)} KB` },
      ]}
      detail={
        <List.Item.Detail
          markdown={detailMarkdown(document)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="File"
                text={document.filename}
              />
              <List.Item.Detail.Metadata.Label
                title="Stage"
                text={document.stage}
              />
              <List.Item.Detail.Metadata.Label
                title="OCR"
                text={
                  document.evidence?.ocrCompleted
                    ? document.evidence.ocrMethod
                    : "Not verified"
                }
              />
              {document.validation ? (
                <List.Item.Detail.Metadata.Label
                  title="Rename confidence"
                  text={`${document.validation.confidence}% · ${document.validation.safe ? "verified" : "blocked"}`}
                />
              ) : null}
              {document.evidence?.doi ? (
                <List.Item.Detail.Metadata.Label
                  title="Detected DOI"
                  text={document.evidence.doi}
                />
              ) : null}
              {document.evidence?.isbn ? (
                <List.Item.Detail.Metadata.Label
                  title="Detected ISBN"
                  text={document.evidence.isbn}
                />
              ) : null}
              {proposed ? (
                <List.Item.Detail.Metadata.Label
                  title="Suggested filename"
                  text={proposed}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Path"
                text={document.path}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Open
            title="Open Document"
            target={document.path}
            icon={Icon.Document}
          />
          <Action.ShowInFinder path={document.path} />
          {document.embedding ? (
            <Action
              title="Find Related Local Documents"
              icon={Icon.Link}
              onAction={() => push(<RelatedDocuments document={document} />)}
            />
          ) : null}
          <Action
            title="Queue Document for Reanalysis"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              await queueLocalDocumentsForReprocessing([document.id]);
              await showToast({
                style: Toast.Style.Success,
                title: "Document queued for the next index run",
              });
              reload();
            }}
          />
          {proposed && document.validation?.safe ? (
            <Action
              title="Apply Strictly Verified Filename"
              icon={Icon.Pencil}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Rename this verified document?",
                  message: `${document.filename}\n\n→ ${proposed}\n\nDOI/ISBN, bibliographic metadata, OCR title and OCR author all agree.`,
                  primaryAction: { title: "Rename" },
                });
                if (!confirmed) return;
                try {
                  await applyVerifiedRename(document.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Document renamed safely",
                  });
                  reload();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Rename blocked",
                    message:
                      error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          ) : null}
          {document.renamedFrom ? (
            <Action
              title="Undo Last Rename"
              icon={Icon.ArrowCounterClockwise}
              onAction={async () => {
                try {
                  await undoDocumentRename(document.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Rename undone",
                  });
                  reload();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Could not undo rename",
                    message:
                      error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy File Path"
            content={document.path}
          />
        </ActionPanel>
      }
    />
  );
}

function RelatedDocuments({ document }: { document: LocalDocument }) {
  const [related, setRelated] = useState<
    Array<{ document: LocalDocument; score: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    void findRelatedDocuments(document.id).then((items) => {
      setRelated(items);
      setIsLoading(false);
    });
  }, [document.id]);
  return (
    <List isLoading={isLoading} navigationTitle="Related Local Documents">
      {related.map(({ document: candidate, score }) => (
        <List.Item
          key={candidate.id}
          title={candidate.work?.title ?? candidate.filename}
          subtitle={candidate.work?.authors.join(", ") || candidate.filename}
          icon={Icon.Document}
          accessories={[{ text: `${Math.round(score * 100)}%` }]}
          actions={
            <ActionPanel>
              <Action.Open title="Open Document" target={candidate.path} />
              <Action.ShowInFinder path={candidate.path} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && !related.length ? (
        <List.EmptyView
          icon={Icon.Link}
          title="No related indexed document"
          description="Index more documents using the same embedding model."
        />
      ) : null}
    </List>
  );
}

function detailMarkdown(document: LocalDocument): string {
  const sections: string[] = [];
  if (document.analysis?.summary)
    sections.push(
      `### Summary\n\n${escapeMarkdown(document.analysis.summary)}`,
    );
  if (document.analysis?.keyPoints.length)
    sections.push(
      `### Key points\n\n${document.analysis.keyPoints
        .map((point) => `- ${escapeMarkdown(point)}`)
        .join("\n")}`,
    );
  if (document.analysis?.keywords.length)
    sections.push(
      `### Keywords\n\n${document.analysis.keywords.map(escapeMarkdown).join(" · ")}`,
    );
  if (document.analysis?.topics.length)
    sections.push(
      `### Topics\n\n${document.analysis.topics.map(escapeMarkdown).join(" · ")}`,
    );
  if (document.validation)
    sections.push(
      `### Rename safety\n\n${document.validation.checks
        .map(
          (check) =>
            `- ${check.passed ? "✓" : "✗"} **${check.label}:** ${escapeMarkdown(check.detail)}`,
        )
        .join("\n")}`,
    );
  if (document.error)
    sections.push(`### Processing error\n\n${escapeMarkdown(document.error)}`);
  if (sections.length) return sections.join("\n\n");
  return document.evidence
    ? "Basic indexing is complete. Experimental summaries and semantic analysis are disabled or have not been requested."
    : "This document is waiting for background indexing.";
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>-]/g, "\\$&");
}
