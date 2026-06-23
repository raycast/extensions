import { Action, ActionPanel, Detail, Icon, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import {
  REQUIRED_FOCUS_OPTIONS,
  REQUIRED_DATABASE_SCHEMA,
  validatePomodoroDatabase,
  type ValidationResult,
} from "./lib/notion";
import { getNotionSettings } from "./lib/preferences";

type ValidationState = {
  isLoading: boolean;
  result?: ValidationResult;
  error?: string;
};

function buildMarkdown(state: ValidationState): string {
  const { notionToken, notionDatabaseId } = getNotionSettings();
  const lines: string[] = [
    "# Notion Setup",
    "",
    "## Current Settings",
    "",
    `- Token: ${notionToken ? "Configured" : "Not set"}`,
    `- Database ID: ${notionDatabaseId ? `\`${notionDatabaseId}\`` : "Not set"}`,
    "",
    "## Required Properties",
    "",
  ];

  for (const [name, propertyType] of Object.entries(REQUIRED_DATABASE_SCHEMA)) {
    lines.push(`- \`${name}\`: \`${propertyType}\``);
  }

  lines.push("", "## Validation", "");

  if (state.isLoading) {
    lines.push("Validating...");
    return lines.join("\n");
  }

  if (state.error) {
    lines.push(`- Status: Failed`, `- Details: ${state.error}`);
    return lines.join("\n");
  }

  if (!state.result) {
    lines.push("Not validated yet. Run **Validate Connection** from the action panel.");
    return lines.join("\n");
  }

  lines.push(`- Status: ${state.result.ok ? "OK" : "Needs fixes"}`);
  if (state.result.databaseTitle) {
    lines.push(`- Database: ${state.result.databaseTitle}`);
  }

  if (state.result.missingProperties.length > 0) {
    lines.push("", "### Missing properties", "", ...state.result.missingProperties.map((name) => `- \`${name}\``));
  }

  if (state.result.invalidProperties.length > 0) {
    lines.push("", "### Type mismatches", "");
    for (const property of state.result.invalidProperties) {
      lines.push(`- \`${property.name}\`: expected \`${property.expected}\`, actual \`${property.actual}\``);
    }
  }

  if (state.result.focusOptions.length > 0) {
    lines.push("", "### Focus options", "", ...state.result.focusOptions.map((name) => `- ${name}`));
  }

  if (state.result.sessionTypeOptions.length > 0) {
    lines.push("", "### Session Type options", "", ...state.result.sessionTypeOptions.map((name) => `- ${name}`));
  }

  if (state.result.missingFocusOptions.length > 0) {
    lines.push(
      "",
      "### Focus warnings",
      "",
      `- Recommended options: ${REQUIRED_FOCUS_OPTIONS.join(", ")}`,
      `- Missing in Notion: ${state.result.missingFocusOptions.join(", ")}`,
      "",
      "The work log form defaults to `High` / `Medium` / `Low`.",
      "Connection can still succeed if required properties and types are correct.",
    );
  }

  if (state.result.missingSessionTypeOptions.length > 0) {
    lines.push(
      "",
      "### Session Type warnings",
      "",
      `- Configured in the extension but missing in Notion: ${state.result.missingSessionTypeOptions.join(", ")}`,
      "",
      "Session Type is saved as a Select property. Add matching options to Notion `Session Type`.",
    );
  }

  if (state.result.ok) {
    lines.push("", "This database can be reused on the next launch.");
  }

  return lines.join("\n");
}

export default function ConfigureNotionCommand() {
  const [state, setState] = useState<ValidationState>({ isLoading: false });
  const { notionToken, notionDatabaseId } = getNotionSettings();

  async function validateConnection() {
    if (!notionToken || !notionDatabaseId) {
      setState({
        isLoading: false,
        error: "Notion Token or Database ID is not set.",
      });
      return;
    }

    setState({ isLoading: true });

    try {
      const result = await validatePomodoroDatabase(notionToken, notionDatabaseId);
      setState({
        isLoading: false,
        result,
      });

      await showToast({
        style: result.ok ? Toast.Style.Success : Toast.Style.Failure,
        title: result.ok
          ? result.missingFocusOptions.length > 0
            ? "Notion connection validated (warnings)"
            : "Notion connection validated"
          : "Notion setup needs fixes",
        message:
          result.ok && (result.missingFocusOptions.length > 0 || result.missingSessionTypeOptions.length > 0)
            ? [
                result.missingFocusOptions.length > 0 ? `Focus: ${result.missingFocusOptions.join(", ")}` : null,
                result.missingSessionTypeOptions.length > 0
                  ? `Session Type: ${result.missingSessionTypeOptions.join(", ")}`
                  : null,
              ]
                .filter(Boolean)
                .join(" / ")
            : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({
        isLoading: false,
        error: message,
      });

      await showToast({
        style: Toast.Style.Failure,
        title: "Notion validation failed",
        message,
      });
    }
  }

  useEffect(() => {
    if (notionToken && notionDatabaseId) {
      validateConnection();
    }
  }, [notionToken, notionDatabaseId]);

  const markdown = useMemo(() => buildMarkdown(state), [state]);

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Validate Connection" icon={Icon.CheckCircle} onAction={validateConnection} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
