import { Action, ActionPanel, Clipboard, Detail, Form, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";

export default function PRCommand() {
  const { push } = useNavigation();

  const [summary, setSummary] = useState("");
  const [bullets, setBullets] = useState([""]);
  const [issue, setIssue] = useState("");
  const [issuePrefix, setIssuePrefix] = useState("Resolves");
  const [includeScreenshot, setIncludeScreenshot] = useState(true);

  function wrapText(text: string, width = 72): string {
    return text
      .split("\n")
      .map((line) => (line.length <= width ? line : (line.match(new RegExp(`.{1,${width}}`, "g"))?.join("\n") ?? line)))
      .join("\n");
  }

  function capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function generatePRMessage() {
    const bulletList = bullets
      .filter(Boolean)
      .map((b) => `- ${b.trim()}`)
      .join("\n");

    const screenshotSection = includeScreenshot ? `\n## Screenshot\n\n![]()\n` : "";

    return `## Summary

${wrapText(capitalizeFirstLetter(summary.trim()))}

## Changes

${bulletList}
${screenshotSection}## Issue

${issuePrefix} #${issue}`;
  }

  function validate(): string[] {
    const errors: string[] = [];
    const trimmedSummary = summary.trim();
    const nonImperativeStarters = ["Added", "Fixed", "Updated", "Changed", "Created"];

    if (!trimmedSummary) errors.push("Summary is required.");
    if (trimmedSummary.length > 50) errors.push("Summary must be 50 characters or less.");
    if (trimmedSummary.endsWith(".")) errors.push("Summary must not end with a period.");
    if (!/^[A-Za-z]/.test(trimmedSummary)) errors.push("Summary must start with a letter.");
    if (nonImperativeStarters.some((word) => trimmedSummary.startsWith(word)))
      errors.push("Use imperative mood (e.g., 'Add', 'Fix', 'Refactor').");
    if (!bullets.filter(Boolean).length) errors.push("At least one bullet point is required.");
    if (!/^\d+$/.test(issue)) errors.push("Issue number must be a number.");

    return errors;
  }

  function handlePreview() {
    const errors = validate();
    if (errors.length > 0) {
      showToast({ style: Toast.Style.Failure, title: "Validation Failed", message: errors.join(" ") });
      return;
    }

    push(<Preview prMessage={generatePRMessage()} />);
  }

  return (
    <Form
      navigationTitle="Create Pull Request Message"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Pull Request Message" onSubmit={handlePreview} />
        </ActionPanel>
      }
    >
      <Form.Description text="Use imperative mood, no period." />
      <Form.TextField
        id="summary"
        title={`Summary (${summary.trim().length}/50)`}
        placeholder="Add login screen"
        value={summary}
        onChange={(v) => setSummary(v.replace(/^./, (c) => c.toUpperCase()))}
      />

      {bullets.map((b, i) => (
        <Form.TextField
          key={i}
          id={`bullet-${i}`}
          title={`Key point ${i + 1}`}
          placeholder="Refactored navbar flexbox"
          value={b}
          onChange={(value) => {
            const newBullets = [...bullets];
            newBullets[i] = value;
            if (i === bullets.length - 1 && value.trim()) newBullets.push("");
            setBullets(newBullets);
          }}
        />
      ))}

      <Form.Checkbox
        id="includeScreenshot"
        label="Include Screenshots"
        value={includeScreenshot}
        onChange={setIncludeScreenshot}
      />

      <Form.Dropdown id="issuePrefix" title="Issue Reference Type" value={issuePrefix} onChange={setIssuePrefix}>
        <Form.Dropdown.Item value="Fixes" title="Fixes" />
        <Form.Dropdown.Item value="Closes" title="Closes" />
        <Form.Dropdown.Item value="Resolves" title="Resolves" />
        <Form.Dropdown.Item value="See" title="See" />
        <Form.Dropdown.Item value="Relates to" title="Relates to" />
      </Form.Dropdown>

      <Form.TextField id="issue" title="Issue Number" placeholder="42" value={issue} onChange={setIssue} />
    </Form>
  );
}

function Preview({ prMessage }: { prMessage: string }) {
  async function handleCopy() {
    await Clipboard.copy(prMessage);
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
    await popToRoot();
  }

  return (
    <Detail
      markdown={`\`\`\`md\n${prMessage}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy to Clipboard" onSubmit={handleCopy} />
        </ActionPanel>
      }
    />
  );
}
