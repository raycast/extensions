/**
 * Template Preview Component
 *
 * Shows a live preview of template results for selected files.
 */

import { List, Icon, Color } from "@raycast/api";
import { extname } from "path";
import type { FileInfo, NamingTemplate, RenameOperation, FileMetadataContext } from "../types";
import { previewTemplate, FileWithMetadata } from "../lib/template";
import { PREVIEW_LIMIT } from "../lib/constants";
import { getFileTypeIcon } from "../lib/file-types";

export interface TemplatePreviewProps {
  /** Template to preview */
  template: NamingTemplate;
  /** Files to apply template to */
  files: FileInfo[];
  /** Optional metadata for files */
  metadata?: Map<string, FileMetadataContext>;
  /** Maximum previews to show */
  limit?: number;
}

/**
 * Template Preview List Section
 */
export function TemplatePreview({ template, files, metadata, limit = PREVIEW_LIMIT }: TemplatePreviewProps) {
  // Convert files to FileWithMetadata format
  const filesWithMetadata: FileWithMetadata[] = files.map((file) => ({
    file,
    metadata: metadata?.get(file.path),
  }));

  // Generate preview operations
  const operations = previewTemplate(template, filesWithMetadata, limit);

  // Check if there are more files than shown
  const hasMore = files.length > limit;

  return (
    <List.Section title="Preview" subtitle={`${operations.length} of ${files.length} files`}>
      {operations.map((op, index) => (
        <TemplatePreviewItem key={op.oldPath} operation={op} index={index} />
      ))}
      {hasMore && (
        <List.Item
          title={`... and ${files.length - limit} more files`}
          icon={{ source: Icon.Ellipsis, tintColor: Color.SecondaryText }}
        />
      )}
    </List.Section>
  );
}

interface TemplatePreviewItemProps {
  operation: RenameOperation;
  index: number;
}

/**
 * Single preview item showing original → new name
 */
function TemplatePreviewItem({ operation, index }: TemplatePreviewItemProps) {
  const originalName = operation.oldPath.split("/").pop() || "";
  const extension = extname(originalName);

  const hasChange = originalName !== operation.newName;
  const icon = getFileTypeIcon(extension);

  return (
    <List.Item
      title={operation.newName}
      subtitle={hasChange ? `← ${originalName}` : "(unchanged)"}
      icon={icon}
      accessories={[
        {
          text: `#${index + 1}`,
          tooltip: `File ${index + 1} in sequence`,
        },
        hasChange
          ? {
              icon: { source: Icon.ArrowRight, tintColor: Color.Green },
              tooltip: "Will be renamed",
            }
          : {
              icon: { source: Icon.Minus, tintColor: Color.SecondaryText },
              tooltip: "No change",
            },
      ]}
    />
  );
}

/**
 * Preview as simple text format
 */
export function formatPreviewText(
  template: NamingTemplate,
  files: FileInfo[],
  metadata?: Map<string, FileMetadataContext>,
  limit: number = PREVIEW_LIMIT,
): string {
  const filesWithMetadata: FileWithMetadata[] = files.map((file) => ({
    file,
    metadata: metadata?.get(file.path),
  }));

  const operations = previewTemplate(template, filesWithMetadata, limit);

  const lines = operations.map((op) => {
    const originalName = op.oldPath.split("/").pop() || "";
    return `${originalName} → ${op.newName}`;
  });

  if (files.length > limit) {
    lines.push(`... and ${files.length - limit} more files`);
  }

  return lines.join("\n");
}

/**
 * Get preview summary
 */
export function getPreviewSummary(operations: RenameOperation[]): { changed: number; unchanged: number } {
  let changed = 0;
  let unchanged = 0;

  for (const op of operations) {
    const originalName = op.oldPath.split("/").pop() || "";
    if (originalName === op.newName) {
      unchanged++;
    } else {
      changed++;
    }
  }

  return { changed, unchanged };
}

/**
 * Preview item for Form description
 */
export function PreviewDescription({
  template,
  files,
  metadata,
}: {
  template: NamingTemplate;
  files: FileInfo[];
  metadata?: Map<string, FileMetadataContext>;
}) {
  const previewText = formatPreviewText(template, files, metadata, 3);

  if (files.length === 0) {
    return null;
  }

  return (
    <List.Item
      title="Preview"
      subtitle={previewText.split("\n")[0]}
      icon={Icon.Eye}
      accessories={[{ text: `${files.length} files`, icon: Icon.Document }]}
    />
  );
}
