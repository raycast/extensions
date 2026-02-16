/**
 * Template Builder Component
 *
 * Provides a form interface for configuring naming templates with
 * variable picker, date source selection, counter options, and more.
 */

import { Form, ActionPanel, Action, Icon, Color } from "@raycast/api";
import type { NamingTemplate } from "../types";
import { SortField, SortDirection, CaseStyle, TemplateDateSource } from "../types/enums";
import { getSortFields } from "../lib/template/sorting";
import { CASE_STYLES, getCaseStyleLabel } from "../lib/case-transform";
import { validateTemplate } from "../lib/template/parser";
import { TEMPLATE_VARIABLES, getVariableMarkdown } from "../lib/template/variable-registry";
import { DATE_SOURCE_LABELS } from "../lib/constants";

export interface TemplateBuilderProps {
  /** Current template values */
  template: NamingTemplate;
  /** Called when template changes */
  onChange: (template: NamingTemplate) => void;
  /** Whether to show save action */
  showSaveAction?: boolean;
  /** Called when save is triggered */
  onSave?: (template: NamingTemplate) => void;
  /** Called when apply is triggered */
  onApply?: (template: NamingTemplate) => void;
}

/**
 * Variable reference derived from the central registry
 */
const VARIABLE_REFERENCE = TEMPLATE_VARIABLES.map((v) => ({
  variable: v.example,
  description: v.description,
}));

const DATE_SOURCES = Object.values(TemplateDateSource).map((value) => ({
  value,
  label: DATE_SOURCE_LABELS[value],
}));

/**
 * Template Builder Form Component
 */
export function TemplateBuilder({ template, onChange, showSaveAction = false, onSave, onApply }: TemplateBuilderProps) {
  const sortFields = getSortFields();
  const patternValidation = validateTemplate(template.pattern);

  const handlePatternChange = (value: string) => {
    onChange({ ...template, pattern: value });
  };

  const handleDateSourceChange = (value: string) => {
    onChange({ ...template, dateSource: value as TemplateDateSource });
  };

  const handleSortFieldChange = (value: string) => {
    onChange({
      ...template,
      sort: { ...template.sort, field: value as SortField },
    });
  };

  const handleSortDirectionChange = (value: boolean) => {
    onChange({
      ...template,
      sort: { ...template.sort, direction: value ? SortDirection.DESC : SortDirection.ASC },
    });
  };

  const handleCounterStartChange = (value: string) => {
    const parsed = parseInt(value, 10);
    const start = Number.isNaN(parsed) ? 1 : parsed;
    onChange({
      ...template,
      counter: { ...template.counter, start },
    });
  };

  const handleCounterStepChange = (value: string) => {
    const step = parseInt(value, 10) || 1;
    onChange({
      ...template,
      counter: { ...template.counter, step },
    });
  };

  const handleCounterPaddingChange = (value: string) => {
    const padding = parseInt(value, 10) || 1;
    onChange({
      ...template,
      counter: { ...template.counter, padding },
    });
  };

  const handleCaseStyleChange = (value: string) => {
    onChange({ ...template, caseStyle: value as CaseStyle });
  };

  const handleTransliterationChange = (value: boolean) => {
    onChange({
      ...template,
      transliteration: { ...template.transliteration, enabled: value },
    });
  };

  const handleRemoveAccentsChange = (value: boolean) => {
    onChange({
      ...template,
      transliteration: { ...template.transliteration, removeAccents: value },
    });
  };

  const handleNameChange = (value: string) => {
    onChange({ ...template, name: value });
  };

  const handleDescriptionChange = (value: string) => {
    onChange({ ...template, description: value });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {onApply && <Action title="Apply Template" icon={Icon.Play} onAction={() => onApply(template)} />}
          {showSaveAction && onSave && (
            <Action
              title="Save Template"
              icon={Icon.SaveDocument}
              onAction={() => onSave(template)}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          <ActionPanel.Section title="Insert Variable">
            {VARIABLE_REFERENCE.slice(0, 10).map((v) => (
              <Action
                key={v.variable}
                title={`Insert ${v.variable}`}
                icon={Icon.Plus}
                onAction={() => handlePatternChange(template.pattern + v.variable)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {/* Template Info */}
      {showSaveAction && (
        <>
          <Form.TextField
            id="name"
            title="Template Name"
            placeholder="My Custom Template"
            value={template.name}
            onChange={handleNameChange}
          />
          <Form.TextField
            id="description"
            title="Description"
            placeholder="Optional description"
            value={template.description || ""}
            onChange={handleDescriptionChange}
          />
          <Form.Separator />
        </>
      )}

      {/* Pattern */}
      <Form.TextField
        id="pattern"
        title="Pattern"
        placeholder="{date:YYYY-MM-DD}_{original}_{counter:001}"
        value={template.pattern}
        onChange={handlePatternChange}
        error={!patternValidation.valid ? patternValidation.error : undefined}
        info="Use variables like {original}, {date}, {counter}"
      />

      <Form.Description
        title="Available Variables"
        text={VARIABLE_REFERENCE.slice(0, 5)
          .map((v) => `${v.variable} - ${v.description}`)
          .join("\n")}
      />

      <Form.Separator />

      {/* Date Settings */}
      <Form.Dropdown
        id="dateSource"
        title="Date Source"
        value={template.dateSource}
        onChange={handleDateSourceChange}
        info="Which date to use for {date} and {time} variables"
      >
        {DATE_SOURCES.map((source) => (
          <Form.Dropdown.Item key={source.value} value={source.value} title={source.label} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {/* Counter Settings */}
      <Form.TextField
        id="counterStart"
        title="Counter Start"
        placeholder="1"
        value={String(template.counter.start)}
        onChange={handleCounterStartChange}
      />
      <Form.TextField
        id="counterStep"
        title="Counter Step"
        placeholder="1"
        value={String(template.counter.step)}
        onChange={handleCounterStepChange}
      />
      <Form.TextField
        id="counterPadding"
        title="Counter Padding"
        placeholder="3"
        value={String(template.counter.padding)}
        onChange={handleCounterPaddingChange}
        info="Number of digits (e.g., 3 for 001, 002, 003)"
      />

      <Form.Separator />

      {/* Sorting */}
      <Form.Dropdown
        id="sortField"
        title="Sort Files By"
        value={template.sort.field}
        onChange={handleSortFieldChange}
        info="Order files before applying counter numbers"
      >
        {sortFields.map((field) => (
          <Form.Dropdown.Item key={field.value} value={field.value} title={field.label} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="sortDescending"
        title="Sort Options"
        label="Descending Order"
        value={template.sort.direction === SortDirection.DESC}
        onChange={handleSortDirectionChange}
      />

      <Form.Separator />

      {/* Text Transformation */}
      <Form.Dropdown id="caseStyle" title="Case Style" value={template.caseStyle} onChange={handleCaseStyleChange}>
        {CASE_STYLES.map((style) => (
          <Form.Dropdown.Item key={style} value={style} title={getCaseStyleLabel(style)} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="transliteration"
        title="Transliteration"
        label="Convert accented characters (café → cafe)"
        value={template.transliteration.enabled}
        onChange={handleTransliterationChange}
      />

      {template.transliteration.enabled && (
        <Form.Checkbox
          id="removeAccents"
          title=""
          label="Remove all accents/diacritics"
          value={template.transliteration.removeAccents}
          onChange={handleRemoveAccentsChange}
        />
      )}
    </Form>
  );
}

/**
 * Get color for pattern validation status
 */
export function getValidationColor(validation: { valid: boolean; warnings?: string[] }): Color {
  if (!validation.valid) return Color.Red;
  if (validation.warnings && validation.warnings.length > 0) return Color.Yellow;
  return Color.Green;
}

/**
 * Format variable reference as markdown
 */
export function getVariableReferenceMarkdown(): string {
  return getVariableMarkdown();
}
