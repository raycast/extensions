/**
 * @module edit-search-form
 *
 * Raycast Form for editing a search artifact. Allows the user to tweak
 * the raw predicate (multiline TextArea), scope path (FilePicker), search
 * depth (Dropdown), and see the derived interpretation preview before running
 * the search.
 *
 * The natural query is preserved from the initial artifact but is not
 * exposed for editing.
 *
 * Actions:
 *  - Run Search: validates predicate, builds artifact, calls onSubmit
 *  - Regenerate with AI: re-runs generateSearchArtifact on stored query
 */

import { Form, Action, ActionPanel, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useCallback } from "react";
import { validatePredicate, parsePredicateInterpretation } from "./logic/predicate-validator";
import { validateScopePath } from "./logic/scope-path";
import { generateSearchArtifact } from "./logic/ai-artifact-generator";
import { formatPredicateForTextArea, normalizePredicateFromTextArea } from "./logic/predicate-textarea";
import { normalizeFindFilesScopeMode, type FindFilesSearchArtifact, type FindFilesScopeMode } from "./logic/types";

export interface EditSearchFormProps {
  /** Existing artifact to edit, or undefined for fresh query */
  initialArtifact?: FindFilesSearchArtifact;
  /** Called when user submits a valid artifact to run search */
  onSubmit: (artifact: FindFilesSearchArtifact) => void;
}

export function EditSearchForm({ initialArtifact, onSubmit }: EditSearchFormProps) {
  const [naturalQuery] = useState(initialArtifact?.naturalQuery ?? "");
  const [predicateTextArea, setPredicateTextArea] = useState(
    initialArtifact?.predicate ? formatPredicateForTextArea(initialArtifact.predicate) : "",
  );
  const [scopePaths, setScopePaths] = useState<string[]>(initialArtifact?.scopePath ? [initialArtifact.scopePath] : []);
  const [interpretation, setInterpretation] = useState(initialArtifact?.interpretation ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [scopeMode, setScopeMode] = useState<FindFilesScopeMode>(
    normalizeFindFilesScopeMode(initialArtifact?.scopeMode),
  );

  const handlePredicateChange = useCallback(
    (value: string) => {
      setPredicateTextArea(value);
      const canonical = normalizePredicateFromTextArea(value);
      if (canonical) {
        const result = validatePredicate(canonical);
        if (!result.valid) {
          setValidationError(result.error);
        } else {
          setValidationError(null);
          const scopePath = scopePaths.length > 0 ? scopePaths[0] : "";
          setInterpretation(parsePredicateInterpretation(canonical, scopePath));
        }
      } else {
        setValidationError(null);
      }
    },
    [scopePaths],
  );

  const handleScopeChange = useCallback(
    (value: string[]) => {
      setScopePaths(value);
      const canonical = normalizePredicateFromTextArea(predicateTextArea);
      if (canonical) {
        const result = validatePredicate(canonical);
        if (result.valid) {
          const scopePath = value.length > 0 ? value[0] : "";
          setInterpretation(parsePredicateInterpretation(canonical, scopePath));
        }
      }
    },
    [predicateTextArea],
  );

  const handleSubmit = useCallback(() => {
    const canonical = normalizePredicateFromTextArea(predicateTextArea);
    if (!canonical) {
      showToast({ style: Toast.Style.Failure, title: "Predicate is required" });
      return;
    }
    const validation = validatePredicate(canonical);
    if (!validation.valid) {
      showToast({ style: Toast.Style.Failure, title: validation.error });
      return;
    }
    const scopePath = scopePaths.length > 0 ? scopePaths[0] : "";
    const scopeValidation = validateScopePath(scopePath);
    if (!scopeValidation.valid) {
      showToast({ style: Toast.Style.Failure, title: scopeValidation.error });
      return;
    }
    const normalizedScope = scopeValidation.normalized;
    const now = Date.now();
    const artifact: FindFilesSearchArtifact = {
      naturalQuery,
      predicate: canonical,
      scopePath: normalizedScope,
      scopeMode,
      interpretation: parsePredicateInterpretation(canonical, normalizedScope),
      createdAt: initialArtifact?.createdAt ?? now,
      updatedAt: now,
    };
    onSubmit(artifact);
  }, [naturalQuery, predicateTextArea, scopeMode, scopePaths, initialArtifact, onSubmit]);

  const handleRegenerate = useCallback(async () => {
    if (!naturalQuery.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Enter a query first" });
      return;
    }
    setIsRegenerating(true);
    try {
      const result = await generateSearchArtifact(naturalQuery);
      if (result.success) {
        setPredicateTextArea(formatPredicateForTextArea(result.artifact.predicate));
        setScopePaths(result.artifact.scopePath ? [result.artifact.scopePath] : []);
        setScopeMode(normalizeFindFilesScopeMode(result.artifact.scopeMode));
        setInterpretation(result.artifact.interpretation);
        setValidationError(null);
        showToast({ style: Toast.Style.Success, title: "Regenerated search artifact" });
      } else {
        showToast({ style: Toast.Style.Failure, title: result.error });
      }
    } catch {
      showToast({ style: Toast.Style.Failure, title: "AI regeneration failed" });
    } finally {
      setIsRegenerating(false);
    }
  }, [naturalQuery]);

  const handleCopyPredicate = useCallback(async () => {
    const canonical = normalizePredicateFromTextArea(predicateTextArea);
    if (!canonical) {
      showToast({ style: Toast.Style.Failure, title: "No predicate to copy" });
      return;
    }
    await Clipboard.copy(canonical);
    showToast({ style: Toast.Style.Success, title: "Predicate copied to clipboard" });
  }, [predicateTextArea]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Run Search" onAction={handleSubmit} />
          <Action title="Regenerate with AI" onAction={handleRegenerate} />
          <Action
            title="Copy Predicate"
            onAction={handleCopyPredicate}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="predicate"
        title="Search Conditions"
        value={predicateTextArea}
        onChange={handlePredicateChange}
        error={validationError ?? undefined}
        placeholder="e.g.&#10;kMDItemContentType == 'public.png'&#10;kMDItemFSName == '*.txt'"
      />
      <Form.FilePicker
        id="scopePath"
        title="Scope Path"
        value={scopePaths}
        onChange={handleScopeChange}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Dropdown id="scopeMode" title="Search Depth" value={scopeMode} onChange={setScopeMode}>
        <Form.Dropdown.Item title="This folder only" value="direct" />
        <Form.Dropdown.Item title="This folder and subfolders" value="recursive" />
      </Form.Dropdown>
      <Form.Description id="interpretation" title="Interpretation" text={interpretation || "No interpretation"} />
      {isRegenerating && <Form.Description id="status" title="Status" text="Regenerating with AI…" />}
    </Form>
  );
}
