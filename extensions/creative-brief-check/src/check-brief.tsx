import { Action, ActionPanel, Detail, Form } from "@raycast/api";
import { useState } from "react";

type BriefValues = {
  goal: string;
  audience: string;
  subjectAction: string;
  references: string;
  camera: string;
  duration: string;
  aspectRatio: string;
  negativeConstraints: string;
};

type Check = {
  label: string;
  value: string;
  required: boolean;
};

function present(value: string): boolean {
  return value.trim().length > 0;
}

function buildReport(values: BriefValues): string {
  const checks: Check[] = [
    { label: "Primary goal", value: values.goal, required: true },
    { label: "Audience", value: values.audience, required: true },
    { label: "Subject and action", value: values.subjectAction, required: true },
    { label: "Approved references", value: values.references, required: true },
    { label: "Aspect ratio", value: values.aspectRatio, required: true },
    { label: "Camera or composition", value: values.camera, required: false },
    { label: "Duration", value: values.duration, required: false },
    { label: "Negative constraints", value: values.negativeConstraints, required: false },
  ];

  const completed = checks.filter((check) => present(check.value));
  const missingRequired = checks.filter((check) => check.required && !present(check.value));
  const missingRecommended = checks.filter((check) => !check.required && !present(check.value));
  const score = Math.round((completed.length / checks.length) * 100);

  const requiredSection =
    missingRequired.length === 0
      ? "All required constraints are present."
      : missingRequired.map((check) => `- ${check.label}`).join("\n");
  const recommendedSection =
    missingRecommended.length === 0
      ? "All recommended constraints are present."
      : missingRecommended.map((check) => `- ${check.label}`).join("\n");
  const summary = checks
    .filter((check) => present(check.value))
    .map((check) => `- **${check.label}:** ${check.value.trim()}`)
    .join("\n");

  return `# Brief Readiness: ${score}%

## Missing Required Items

${requiredSection}

## Recommended Additions

${recommendedSection}

## Supplied Brief

${summary || "No brief details were supplied."}

---

This check verifies whether constraints are explicit. It does not approve factual claims, licensing, brand compliance, or final output accuracy.`;
}

export default function Command() {
  const [report, setReport] = useState<string>();

  if (report) {
    return (
      <Detail
        markdown={report}
        actions={
          <ActionPanel>
            <Action title="Edit Brief" onAction={() => setReport(undefined)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Brief" onSubmit={(values: BriefValues) => setReport(buildReport(values))} />
        </ActionPanel>
      }
    >
      <Form.Description text="Required fields establish the minimum production context. Recommended fields reduce ambiguity." />
      <Form.TextField id="goal" title="Primary Goal" placeholder="What should this asset accomplish?" />
      <Form.TextField id="audience" title="Audience" placeholder="Who should understand or act on it?" />
      <Form.TextArea
        id="subjectAction"
        title="Subject And Action"
        placeholder="Describe the subject and the observable action."
      />
      <Form.TextArea
        id="references"
        title="Approved References"
        placeholder="List approved files, URLs, or visual details that must remain accurate."
      />
      <Form.Separator />
      <Form.TextField id="camera" title="Camera Or Composition" placeholder="For example: static close-up, centered." />
      <Form.TextField id="duration" title="Duration" placeholder="For example: 12 seconds." />
      <Form.Dropdown id="aspectRatio" title="Aspect Ratio" defaultValue="">
        <Form.Dropdown.Item value="" title="Not specified" />
        <Form.Dropdown.Item value="1:1" title="1:1 Square" />
        <Form.Dropdown.Item value="4:5" title="4:5 Portrait" />
        <Form.Dropdown.Item value="9:16" title="9:16 Vertical" />
        <Form.Dropdown.Item value="16:9" title="16:9 Landscape" />
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      <Form.TextArea
        id="negativeConstraints"
        title="Negative Constraints"
        placeholder="List artifacts, changes, claims, or details that must be avoided."
      />
    </Form>
  );
}
