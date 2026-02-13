/**
 * Shared form view for rename commands.
 * Used by both rename.tsx and clipboard-rename.tsx.
 */

import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { CASE_STYLES, getCaseStyleLabel } from "../lib/case-transform";
import { buildAutoSummary } from "../lib/selection-summary";
import { UndoAction } from "./undo-action";
import type { UseRenameFormResult } from "../hooks/use-rename-form";
import type { CaseStyle, SelectionMode } from "../types";

interface RenameFormViewProps {
  form: UseRenameFormResult;
  mode: SelectionMode;
  /** Info text for the "New Name" field */
  newNameInfo?: string;
}

export function RenameFormView({ form, mode, newNameInfo }: RenameFormViewProps) {
  const defaultInfo = form.files.length > 1 ? "Base name for all files (index will be added)" : "New filename";

  const showGlobalName = !form.preserveName;

  return (
    <Form
      isLoading={form.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" icon={Icon.Pencil} onSubmit={form.renameFiles} />
          <UndoAction />
        </ActionPanel>
      }
    >
      {form.files.length > 0 && (
        <>
          <Form.Description
            title={mode === "folders" ? "Selected Folders" : "Selected Files"}
            text={buildAutoSummary(form.files)}
          />

          <Form.Checkbox
            id="preserveName"
            label="Preserve original filename"
            info="Keep the original filename and only add prefix/suffix"
            value={form.preserveName}
            onChange={form.setPreserveName}
          />

          {showGlobalName && (
            <Form.TextField
              id="newName"
              title="New Name"
              value={form.newName}
              onChange={form.setNewName}
              placeholder={form.files.length === 1 ? form.files[0]?.baseName || "Enter new name" : "Enter base name"}
              info={newNameInfo || defaultInfo}
            />
          )}

          {/* Independent numbering — shown when 2+ extensions and not preserving names */}
          {form.hasMultipleExtensions && !form.preserveName && (
            <Form.Checkbox
              id="independentNumbering"
              label="Number each file type independently"
              info="Each file type starts counting from 1 instead of sharing a single sequence"
              value={form.independentNumbering}
              onChange={form.setIndependentNumbering}
            />
          )}

          <Form.TextField
            id="prefix"
            title="Prefix"
            value={form.prefix}
            onChange={form.setPrefix}
            placeholder="Optional prefix"
          />

          <Form.TextField
            id="suffix"
            title="Suffix"
            value={form.suffix}
            onChange={form.setSuffix}
            placeholder="Optional suffix"
          />

          <Form.Dropdown
            id="caseStyle"
            title="Case Style"
            value={form.caseStyle}
            onChange={(v) => form.setCaseStyle(v as CaseStyle)}
          >
            {CASE_STYLES.map((style) => (
              <Form.Dropdown.Item key={style} value={style} title={getCaseStyleLabel(style)} />
            ))}
          </Form.Dropdown>

          <Form.TextField
            id="separator"
            title="Separator"
            value={form.separator}
            onChange={(value) => form.handleSeparatorChange("separator", value)}
            placeholder="_"
            info="Character between prefix/suffix and filename"
          />

          {form.files.length > 1 && !form.preserveName && (
            <>
              <Form.TextField
                id="indexSeparator"
                title="Index Separator"
                value={form.indexSeparator}
                onChange={(value) => form.handleSeparatorChange("indexSeparator", value)}
                placeholder="-"
                info="Character before the number"
              />

              <Form.TextField
                id="startNumber"
                title="Start Number"
                value={form.startNumber}
                onChange={form.setStartNumber}
                placeholder="1"
                info="First number in sequence"
              />

              <Form.TextField
                id="paddingDigits"
                title="Padding Digits"
                value={form.paddingDigits}
                onChange={form.setPaddingDigits}
                placeholder="0 (auto)"
                info="Number of digits (0 = auto based on file count)"
              />
            </>
          )}

          <Form.Separator />

          <Form.Description title="Preview" text={form.preview.join("\n") || "No preview available"} />

          {!form.isFormValid() && form.files.length > 1 && !form.preserveName && (
            <Form.Description title="Warning" text="Please enter a new name for the files" />
          )}
        </>
      )}
    </Form>
  );
}
